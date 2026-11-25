#!/usr/bin/env python3
"""Deploy the installed VoiceStudio CLI and manage private Granite narration jobs."""

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shlex
import stat
import subprocess
import sys
import tarfile
import tempfile


PROJECT = Path(__file__).resolve().parents[2]
DATA = PROJECT / "data/narration-chpc"
GRANITE_HOST = "granite.chpc.utah.edu"
PUBLIC_DEFAULTS = PROJECT / "scripts/chpc/narration-defaults.json"
BACKEND_SOURCES = {
    "cosyvoice3": (
        "engines/cosyvoice_subprocess/main.py",
        "engines/cosyvoice_subprocess/requirements.txt",
    ),
    # The production worker shares the app helpers from this existing location.
    "voxcpm2": (
        "engines/voxcpm2_subprocess/main.py", "services/__init__.py",
        "services/tts_backend.py", "services/audio_dsp.py",
        "services/text_normalization.py", "services/pronunciation.py",
        "services/dub_qc.py", "core/__init__.py", "core/language_variants.py",
    ),
}
DEPLOY_SCRIPTS = (
    "bootstrap-voicestudio.sh", "render-narration.sbatch",
    "render-cosyvoice3.py", "render-cosyvoice3.sbatch",
    "cosyvoice3-comparison-bootstrap.sh", "check-narration.py", "check-narration.sbatch",
)


def narration_defaults():
    local = DATA / "narration-defaults.json"
    return local if local.is_file() else PUBLIC_DEFAULTS


def selected_engine(override=None):
    engine = override or json.loads(narration_defaults().read_text())["engine"]
    if engine not in {"cosyvoice3", "omnivoice"}:
        raise SystemExit(f"Unsupported narration engine: {engine}")
    return engine


def safe_id(value):
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", value):
        raise argparse.ArgumentTypeError("Use 1–80 letters, numbers, underscores or hyphens.")
    return value


def job_id(value):
    if not re.fullmatch(r"[0-9]+", value):
        raise argparse.ArgumentTypeError("Job ID must be numeric.")
    return value


def university_uid(value):
    match = re.fullmatch(r"[uU]?([0-9]{7})", value.strip())
    if not match:
        raise argparse.ArgumentTypeError("Enter a CHPC UID as u followed by seven digits.")
    return "u" + match[1]


def configured_uid(override=None):
    saved = DATA / "uid"
    value = override or os.environ.get("CHPC_UID")
    if value is None:
        try:
            value = saved.read_text()
        except FileNotFoundError:
            pass
    if value is not None:
        try:
            return university_uid(value)
        except argparse.ArgumentTypeError as error:
            raise SystemExit(str(error)) from error
    if not sys.stdin.isatty():
        raise SystemExit("Set CHPC_UID or run login in a terminal to enter your CHPC UID.")
    try:
        value = university_uid(input("CHPC UID (u followed by seven digits): "))
    except (EOFError, argparse.ArgumentTypeError) as error:
        raise SystemExit(str(error) or "A CHPC UID is required.") from error
    DATA.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        with saved.open("x") as stream:
            stream.write(value + "\n")
    except FileExistsError:
        if value != university_uid(saved.read_text()):
            raise SystemExit("Another setup saved a different CHPC UID. Re-run with --uid to choose an account.")
    return value


def remote_root(uid):
    return f"/scratch/general/vast/{uid}/next-move-narration"


def ssh_options(uid, batch=True):
    directory = Path(f"/tmp/next-move-chpc-{os.getuid()}")
    try:
        directory.mkdir(mode=0o700)
    except FileExistsError:
        details = directory.lstat()
        if not stat.S_ISDIR(details.st_mode) or details.st_uid != os.getuid():
            raise SystemExit(f"Unsafe SSH socket directory: {directory}")
        directory.chmod(0o700)
    options = [
        "ssh", "-S", str(directory / f"control-{uid}"),
        "-o", "ControlMaster=auto", "-o", "ControlPersist=2h",
        "-o", "StrictHostKeyChecking=yes", "-o", "ConnectTimeout=15",
    ]
    if batch:
        options += ["-o", "BatchMode=yes"]
    return options


def remote(uid, script, *arguments, **kwargs):
    root_assignment = f"root={shlex.quote(remote_root(uid))}\n"
    command = shlex.join(["bash", "-c", "set -euo pipefail\numask 077\n" + root_assignment + script, "--", *arguments])
    return subprocess.run([*ssh_options(uid), f"{uid}@{GRANITE_HOST}", command], check=True, **kwargs)


def upload(uid, archive, batch=None):
    with archive.open("rb") as stream:
        if batch:
            remote(uid, 'mkdir -p "$root/batches"; stage=$(mktemp -d "$root/.upload.XXXXXX"); trap \'rm -rf -- "$stage"\' EXIT; tar -xzf - -C "$stage"; test ! -e "$root/batches/$1"; mv -T "$stage/batches/$1" "$root/batches/$1"', batch, stdin=stream)
        else:
            remote(uid, 'mkdir -p "$root"; tar -xzf - -C "$root"', stdin=stream)


def archive_filter(info):
    if "__pycache__" in Path(info.name).parts or info.name.endswith((".pyc", ".pyo")):
        return None
    if info.issym() or info.islnk():
        raise SystemExit(f"Refusing to package symlink: {info.name}")
    info.mode = 0o700 if info.isdir() else 0o600
    return info


def deploy(uid, resources, revision):
    resources = resources.resolve()
    if revision is None:
        marker = Path.home() / ".cache/huggingface/hub/models--k2-fsa--OmniVoice/voicestudio-revision"
        if marker.is_file():
            revision = marker.read_text().strip()
    if not revision or not re.fullmatch(r"[a-f0-9]{40}", revision):
        raise SystemExit("Supply --model-revision with the installed OmniVoice commit, or retain VoiceStudio's local voicestudio-revision marker.")
    names = ["omnivoice", "pyproject.toml", "uv.lock", "README.md", "LICENSE", "LICENSE-NOTICE.md"]
    for name in names:
        if not (resources / name).exists():
            raise SystemExit(f"Missing installed VoiceStudio source: {resources / name}")
    sources = {}
    for name in names:
        entry = resources / name
        for path in sorted(entry.rglob("*") if entry.is_dir() else [entry]):
            if path.is_file() and "__pycache__" not in path.parts and path.suffix not in {".pyc", ".pyo"}:
                sources[str(path.relative_to(resources))] = hashlib.sha256(path.read_bytes()).hexdigest()
    digest = hashlib.sha256(json.dumps(sources, sort_keys=True).encode()).hexdigest()
    version = re.search(r'^version = "([^"]+)"', (resources / "pyproject.toml").read_text(), re.M)
    version = version.group(1) if version else "unknown"
    provenance = json.dumps({"version": version, "source_sha256": digest, "files": sources}, indent=2).encode()
    backend = {}
    for engine, relatives in BACKEND_SOURCES.items():
        backend[engine] = {}
        for relative in relatives:
            path = resources / "backend" / relative
            if not path.is_file() or path.is_symlink():
                raise SystemExit(f"Missing regular installed VoiceStudio source: {path}")
            backend[engine][relative] = hashlib.sha256(path.read_bytes()).hexdigest()
    for name in DEPLOY_SCRIPTS:
        if not (PROJECT / "scripts/chpc" / name).is_file():
            raise SystemExit(f"Missing narration worker: {name}")
    # A running job must keep the exact CLI source it started with.
    remote(uid, '''python3 - "$root" "$1" "$2" "$3" <<'PY'
import hashlib
import json
from pathlib import Path
import sys

root = Path(sys.argv[1])
provenance = root / "runtime/source-provenance.json"
if provenance.is_file() and json.loads(provenance.read_text())["source_sha256"] != sys.argv[2]:
    raise SystemExit("Installed VoiceStudio changed; use a separate runtime before redeploying.")
for name in ("model-revision.txt", "requested-model-revision.txt"):
    pin = root / name
    if pin.exists() and pin.read_text().strip() != sys.argv[3]:
        raise SystemExit("Model pin changed; use a separate runtime.")
for engine, sources in json.loads(sys.argv[4]).items():
    provenance = root / engine / "voice-studio-source.json"
    previous = json.loads(provenance.read_text())["source_files"] if provenance.is_file() else {}
    for relative, expected in sources.items():
        path = root / engine / "voice-studio-backend" / relative
        if relative in previous and previous[relative] != expected:
            raise SystemExit(f"Installed app source changed: {engine}/{relative}; use a separate runtime.")
        if path.is_symlink() or (path.exists() and (not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected)):
            raise SystemExit(f"Existing app source conflicts: {engine}/{relative}; use a separate runtime.")
    ready = root / engine / "ready.json"
    if engine == "cosyvoice3" and ready.is_file():
        record = json.loads(ready.read_text())
        for relative, field in (("engines/cosyvoice_subprocess/main.py", "sidecar_sha256"),
                                ("engines/cosyvoice_subprocess/requirements.txt", "requirements_sha256")):
            if record[field] != sources[relative]:
                raise SystemExit("CosyVoice ready record belongs to another app source; use a separate runtime.")
PY''', digest, revision, json.dumps(backend, sort_keys=True))
    DATA.mkdir(parents=True, exist_ok=True, mode=0o700)
    with tempfile.TemporaryDirectory(dir=DATA) as temporary:
        archive = Path(temporary) / "runtime.tgz"
        with tarfile.open(archive, "w:gz") as tar:
            for name in names:
                tar.add(resources / name, arcname=f"runtime/{name}", filter=archive_filter)
            info = tarfile.TarInfo("runtime/source-provenance.json")
            info.mode, info.size = 0o600, len(provenance)
            tar.addfile(info, io.BytesIO(provenance))
            pin = (revision + "\n").encode()
            info = tarfile.TarInfo("requested-model-revision.txt")
            info.mode, info.size = 0o600, len(pin)
            tar.addfile(info, io.BytesIO(pin))
            for engine, files in backend.items():
                for name in files:
                    tar.add(resources / "backend" / name, arcname=f"{engine}/voice-studio-backend/{name}", filter=archive_filter)
                source_record = json.dumps({"voice_studio_version": version, "source_files": files}, indent=2).encode()
                info = tarfile.TarInfo(f"{engine}/voice-studio-source.json")
                info.mode, info.size = 0o600, len(source_record)
                tar.addfile(info, io.BytesIO(source_record))
            for name in DEPLOY_SCRIPTS:
                tar.add(PROJECT / "scripts/chpc" / name, arcname=f"scripts/{name}", filter=archive_filter)
            tar.add(narration_defaults(), arcname="narration-defaults.json", filter=archive_filter)
        upload(uid, archive)
    print(f"Uploaded VoiceStudio {version}, native CosyVoice sources and narration workers; source SHA-256 {digest}")
    print(f"Pinned OmniVoice to installed model revision {revision}")


def submit(uid, args, setup=False):
    engine = selected_engine(args.engine)
    options = ["sbatch", "--parsable", f"--account={args.account}", f"--partition={args.partition}"]
    if args.qos:
        options.append(f"--qos={args.qos}")
    if not setup:
        options.append(f"--gres=gpu:{args.gpu_type}:1")
    if setup:
        options += ["--job-name=nm-voice-setup", "--nodes=1", "--ntasks=1", "--cpus-per-task=4", "--mem=32G", "--time=00:30:00"]
        # GPU partitions require an explicit GRES request even during setup.
        if args.setup_gpu:
            options.append("--gres=gpu:h200:1")
    script = 'mkdir -p "$root/logs"; cd "$root"\n'
    script += "exec " + shlex.join(options) + ' --output="$root/logs/%j.out" --error="$root/logs/%j.err" '
    if setup:
        if engine == "cosyvoice3":
            # CosyVoice's isolated bootstrap uses the frozen shared Python for
            # archive extraction and Hugging Face downloads. Fresh installs
            # must establish it first; existing shared runtimes stay intact.
            setup_command = f"set -eu\nroot={shlex.quote(remote_root(uid))}\n" + '''if [ ! -x "$root/runtime/.venv/bin/python" ] || [ ! -f "$root/model-ready.json" ]; then
  bash "$root/scripts/bootstrap-voicestudio.sh" "$root"
fi
exec bash "$root/scripts/cosyvoice3-comparison-bootstrap.sh" "$root"'''
            script += "--wrap=" + shlex.quote(setup_command)
        else:
            script += '"$root/scripts/bootstrap-voicestudio.sh" "$root"'
    else:
        filename = "render-cosyvoice3.sbatch" if engine == "cosyvoice3" else "render-narration.sbatch"
        script += f'"$root/scripts/{filename}" "$root" "$1"'
    result = remote(uid, script, *([] if setup else [args.batch]), capture_output=True, text=True)
    value = result.stdout.strip().split(";")[0]
    if not value.isdigit():
        raise SystemExit(f"Unexpected sbatch response: {result.stdout}")
    print(f"Submitted {'setup' if setup else args.batch} with {engine}: job {value}")


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--uid", type=university_uid, help="CHPC UID for this command. Overrides CHPC_UID and the saved UID.")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("login", help="Authenticate interactively once; reuse a private two-hour SSH connection")
    commands.add_parser("inspect", help="Read available accounts, GPU queues and home disk capacity")
    deploy_parser = commands.add_parser("deploy", help="Upload the installed VoiceStudio CLI source and locked dependencies")
    deploy_parser.add_argument("--resources", type=Path, default=Path("/Applications/VoiceStudio.app/Contents/Resources"))
    deploy_parser.add_argument("--model-revision", help="40-character installed model commit; defaults to VoiceStudio's local revision marker")
    for name in ("setup", "submit"):
        command = commands.add_parser(name)
        if name == "submit":
            command.add_argument("batch", type=safe_id)
            command.add_argument("--gpu-type", choices=["h200", "h200_1g.18gb"], default="h200_1g.18gb", help="18 GB H200 MIG slice by default; h200 requests a full GPU")
        command.add_argument("--account", required=True, help="Exact account from mychpc batch")
        command.add_argument("--partition", required=True, help="Exact partition from mychpc batch")
        command.add_argument("--qos")
        command.add_argument("--engine", choices=["cosyvoice3", "omnivoice"], help="Defaults to the selected engine in narration-defaults.json")
        if name == "setup":
            command.add_argument("--setup-gpu", action="store_true", help="Also reserve one H200 if the selected setup partition requires GPUs")
    send = commands.add_parser("upload", help="Upload one prepared private batch")
    send.add_argument("batch", type=safe_id)
    for name in ("status", "logs", "cancel"):
        command = commands.add_parser(name)
        command.add_argument("job", type=job_id)
    fetch = commands.add_parser("fetch", help="Download completed audio into ignored local data storage")
    fetch.add_argument("batch", type=safe_id)
    fetch.add_argument("job", type=job_id)
    args = parser.parse_args()
    uid = configured_uid(args.uid)
    if args.command == "login":
        host = f"{uid}@{GRANITE_HOST}"
        check = subprocess.run([*ssh_options(uid), "-O", "check", host], capture_output=True)
        if check.returncode == 0:
            print("Granite SSH connection is already ready.")
            return
        subprocess.run([*ssh_options(uid, batch=False), "-MNf", host], check=True)
        print("Granite SSH connection ready for two hours.")
    elif args.command == "inspect":
        remote(uid, 'hostname; mychpc batch; df -h "$HOME"; sinfo -N -o "%N %P %G %m %t" | awk \'NR==1 || /h200/\'')
    elif args.command == "deploy":
        deploy(uid, args.resources, args.model_revision)
    elif args.command in {"setup", "submit"}:
        submit(uid, args, setup=args.command == "setup")
    elif args.command == "upload":
        batch = DATA / "batches" / args.batch
        for name in ("narration.jsonl", "metadata.json", "reference.wav"):
            if not (batch / name).is_file():
                raise SystemExit(f"Missing prepared batch file: {batch / name}")
        remote(uid, 'test ! -e "$root/batches/$1" || { echo "Batch already exists; choose a new ID." >&2; exit 1; }', args.batch)
        with tempfile.TemporaryDirectory(dir=DATA) as temporary:
            archive = Path(temporary) / "batch.tgz"
            with tarfile.open(archive, "w:gz") as tar:
                for name in ("narration.jsonl", "metadata.json", "reference.wav"):
                    tar.add(batch / name, arcname=f"batches/{args.batch}/{name}", filter=archive_filter)
            upload(uid, archive, args.batch)
        print(f"Uploaded batch {args.batch}")
    elif args.command == "status":
        remote(uid, 'squeue -j "$1" -o "%.18i %.10T %.10M %.24R" || true; sacct -j "$1" --format=JobID,State,ExitCode,Elapsed,MaxRSS,AllocTRES', args.job)
    elif args.command == "logs":
        remote(uid, 'for suffix in out err; do if [ -f "$root/logs/$1.$suffix" ]; then tail -n 80 "$root/logs/$1.$suffix"; fi; done', args.job)
    elif args.command == "cancel":
        remote(uid, 'scancel "$1"', args.job)
    elif args.command == "fetch":
        target = DATA / "downloads" / args.batch / args.job
        if target.exists():
            raise SystemExit(f"Download already exists: {target}")
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        with tempfile.TemporaryDirectory(dir=target.parent) as temporary:
            stage = Path(temporary) / "download"
            stage.mkdir(mode=0o700)
            archive = Path(temporary) / "results.tgz"
            with archive.open("wb") as stream:
                remote(uid, 'test -f "$root/batches/$1/results-$2/complete.json"; tar -czf - -C "$root/batches/$1" "results-$2"', args.batch, args.job, stdout=stream)
            with tarfile.open(archive) as tar:
                tar.extractall(stage, filter="data")
            stage.rename(target)
        print(f"Downloaded verified audio to {target}")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        if error.stderr:
            print(error.stderr, end="")
        raise SystemExit(error.returncode)

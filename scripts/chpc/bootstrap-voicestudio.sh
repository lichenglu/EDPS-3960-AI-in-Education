#!/usr/bin/env bash
# Submit with sbatch on an allocated CPU partition; never install on a login node.
#SBATCH --job-name=next-move-voice-setup
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --time=01:00:00
set -euo pipefail
umask 077

if [[ -z "${SLURM_JOB_ID:-}" ]]; then
  echo 'Submit this setup script with sbatch; it must run in a compute allocation.' >&2
  exit 1
fi
root=${1:?Usage: bootstrap-voicestudio.sh ABSOLUTE_REMOTE_ROOT}
[[ "$root" = /* ]] || { echo 'Remote root must be absolute.' >&2; exit 1; }
runtime="$root/runtime"
[[ -f "$runtime/uv.lock" && -f "$runtime/pyproject.toml" && -d "$runtime/omnivoice" ]] || {
  echo 'Upload the installed VoiceStudio CLI source and lockfile before setup.' >&2
  exit 1
}
mkdir -p "$root/cache/uv" "$root/cache/huggingface" "$root/tools"
export UV_CACHE_DIR="$root/cache/uv"
export UV_PYTHON_INSTALL_DIR="$root/tools/python"
export HF_HOME="$root/cache/huggingface"
export OMP_NUM_THREADS="${SLURM_CPUS_PER_TASK:-4}"

if ! command -v uv >/dev/null 2>&1; then
  # CHPC's system Python can be too old for uv; prefer its verified site module.
  if ! type module >/dev/null 2>&1 && [[ -r /etc/profile.d/modules.sh ]]; then
    source /etc/profile.d/modules.sh
  fi
  if type module >/dev/null 2>&1; then
    module load uv/0.11.14 || echo 'CHPC uv module unavailable; trying Python bootstrap.' >&2
  fi
fi

if command -v uv >/dev/null 2>&1; then
  uv_bin=$(command -v uv)
else
  # This small bootstrap environment stays separate from the locked app runtime.
  python3 -c 'import sys; assert sys.version_info >= (3, 8), "Load Python 3.8+ or a CHPC uv module before setup."'
  [[ -x "$root/tools/uv-env/bin/python" ]] || python3 -m venv "$root/tools/uv-env"
  "$root/tools/uv-env/bin/python" -m pip install 'uv==0.12.13'
  uv_bin="$root/tools/uv-env/bin/uv"
fi

cd "$runtime"
"$uv_bin" sync --frozen --no-default-groups --group cuda --python 3.12
"$uv_bin" pip freeze --python "$runtime/.venv/bin/python" > "$root/environment.txt"

"$runtime/.venv/bin/python" - "$root" <<'PY'
import hashlib
import json
import re
import sys
import tomllib
from pathlib import Path

from huggingface_hub import HfApi, snapshot_download

root = Path(sys.argv[1])
revision_file = root / "model-revision.txt"
requested_file = root / "requested-model-revision.txt"
requested = requested_file.read_text().strip() if requested_file.exists() else None
if requested is not None and not re.fullmatch(r"[a-f0-9]{40}", requested):
    raise SystemExit("Invalid requested model revision; use a full Hugging Face commit hash.")
if revision_file.exists():
    revision = revision_file.read_text().strip()
    if not re.fullmatch(r"[a-f0-9]{40}", revision):
        raise SystemExit("Invalid pinned model revision; inspect model-revision.txt.")
    if requested is not None and requested != revision:
        raise SystemExit("Requested local model revision conflicts with this installation; use a new remote root.")
    pin_source = "requested-local-cache" if requested else "existing-pin"
else:
    if (root / "model").exists():
        raise SystemExit("Model directory exists without provenance; use a new remote root.")
    revision = requested or HfApi().model_info("k2-fsa/OmniVoice").sha
    pin_source = "requested-local-cache" if requested else "hub-resolved"
    if not revision or not re.fullmatch(r"[a-f0-9]{40}", revision):
        raise SystemExit("Hugging Face did not return an immutable model revision.")
    # Persist the pin before downloading so interrupted setup resumes this revision.
    with revision_file.open("x") as stream:
        stream.write(revision + "\n")

snapshot_download("k2-fsa/OmniVoice", revision=revision, local_dir=root / "model")
if not (root / "model/config.json").is_file() or not (root / "model/audio_tokenizer").is_dir():
    raise SystemExit("Pinned model is incomplete: checkpoint and bundled audio tokenizer are required.")
runtime = root / "runtime"
record = {
    "model_id": "k2-fsa/OmniVoice",
    "model_revision": revision,
    "model_pin_source": pin_source,
    "voice_studio_version": tomllib.loads((runtime / "pyproject.toml").read_text())["project"]["version"],
    "pyproject_sha256": hashlib.sha256((runtime / "pyproject.toml").read_bytes()).hexdigest(),
    "uv_lock_sha256": hashlib.sha256((runtime / "uv.lock").read_bytes()).hexdigest(),
    "cli_sha256": hashlib.sha256((runtime / "omnivoice/cli/infer_batch.py").read_bytes()).hexdigest(),
    "model_code_sha256": hashlib.sha256((runtime / "omnivoice/models/omnivoice.py").read_bytes()).hexdigest(),
}
temporary = root / ".model-ready.json.tmp"
temporary.write_text(json.dumps(record, indent=2) + "\n")
temporary.replace(root / "model-ready.json")
print(f"VoiceStudio CUDA environment and pinned OmniVoice model ready: {revision}")
PY

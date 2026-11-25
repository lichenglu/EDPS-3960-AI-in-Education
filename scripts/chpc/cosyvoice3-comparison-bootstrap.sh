#!/usr/bin/env bash
# Voice Studio's isolated, pinned native CosyVoice 3 recipe.
#SBATCH --job-name=nm-cosyvoice3-setup
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --time=00:30:00
set -euo pipefail
umask 077
[[ -n "${SLURM_JOB_ID:-}" ]] || { echo 'Submit with sbatch.' >&2; exit 1; }
root=${1:?Usage: cosyvoice3-comparison-bootstrap.sh ABSOLUTE_ROOT}
[[ "$root" = /* ]] || exit 1
engine="$root/cosyvoice3"
app="$engine/voice-studio-backend/engines/cosyvoice_subprocess"
[[ -f "$app/main.py" && -f "$app/requirements.txt" ]] || {
  echo 'Copy the installed Voice Studio CosyVoice sidecar and requirements first.' >&2; exit 1;
}
if ! command -v uv >/dev/null 2>&1; then
  if ! type module >/dev/null 2>&1 && [[ -r /etc/profile.d/modules.sh ]]; then source /etc/profile.d/modules.sh; fi
  module load uv/0.11.14
fi
command -v c++ >/dev/null || { echo 'A C++ compiler is required for the app-pinned PyWORLD build.' >&2; exit 1; }
export UV_CACHE_DIR="$root/cache/uv"
export UV_PYTHON_INSTALL_DIR="$root/tools/python"
export HF_HOME="$root/cache/huggingface"
export MAX_JOBS="${SLURM_CPUS_PER_TASK:-4}"
mkdir -p "$engine" "$UV_CACHE_DIR" "$HF_HOME"

# Fetch exactly the revisions declared by the installed app, not recursive main.
"$root/runtime/.venv/bin/python" - "$engine" <<'PY'
import hashlib
import json
from pathlib import Path
import shutil
import sys
import tarfile
import tempfile
import urllib.request

engine = Path(sys.argv[1])
sources = [
    ("CosyVoice", "https://github.com/FunAudioLLM/CosyVoice/archive/074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc.tar.gz", "074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc", "cosyvoice/cli/cosyvoice.py"),
    ("CosyVoice/third_party/Matcha-TTS", "https://github.com/shivammehta25/Matcha-TTS/archive/dd9105b34bf2be2230f4aa1e4769fb586a3c824e.tar.gz", "dd9105b34bf2be2230f4aa1e4769fb586a3c824e", "matcha/__init__.py"),
    ("CosyVoice/third_party/PyWorld", "https://github.com/JeremyCCHsu/Python-Wrapper-for-World-Vocoder/archive/f31ad88d543fdaebbda2d0c9a5e4d4f991ae0b6c.tar.gz", "f31ad88d543fdaebbda2d0c9a5e4d4f991ae0b6c", "pyworld/__init__.py"),
    ("CosyVoice/third_party/PyWorld/lib/World", "https://github.com/mmorise/World/archive/d625e7608ca23a870018f01e7c562ac683d9847f.tar.gz", "d625e7608ca23a870018f01e7c562ac683d9847f", "src/dio.cpp"),
]
records = []
for relative, url, revision, required in sources:
    destination = engine / relative
    marker = destination / ".voice-studio-source-revision"
    if marker.is_file():
        if marker.read_text().strip() != revision or not (destination / required).is_file():
            raise SystemExit(f"Existing source conflicts with the installed app recipe: {relative}")
        archive_hash = None
    else:
        if destination.exists():
            if any(destination.iterdir()):
                raise SystemExit(f"Unmarked nonempty source directory: {destination}")
            destination.rmdir()
        with tempfile.TemporaryDirectory(dir=engine) as temporary:
            temporary = Path(temporary)
            archive = temporary / "source.tar.gz"
            print(f"Fetching pinned source: {relative}@{revision}", flush=True)
            urllib.request.urlretrieve(url, archive)
            archive_hash = hashlib.sha256(archive.read_bytes()).hexdigest()
            unpack = temporary / "unpack"
            unpack.mkdir()
            with tarfile.open(archive, "r:gz") as tar:
                # App policy also drops links: Matcha contains an author's data link.
                members = [entry for entry in tar.getmembers() if entry.isfile() or entry.isdir()]
                tar.extractall(unpack, members=members, filter="data")
            children = list(unpack.iterdir())
            if len(children) != 1 or not (children[0] / required).is_file():
                raise SystemExit(f"Unexpected pinned archive contents for {relative}")
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(children[0]), str(destination))
            marker.write_text(revision + "\n")
    records.append({"path": relative, "revision": revision, "url": url, "download_sha256": archive_hash})
(engine / "source-pins.json").write_text(json.dumps(records, indent=2) + "\n")
PY

[[ -x "$engine/.venv/bin/python" ]] || uv venv --python 3.10 "$engine/.venv"
if [[ -s "$engine/environment.txt" ]]; then
  uv pip sync --python "$engine/.venv/bin/python" "$engine/environment.txt" \
    --extra-index-url https://download.pytorch.org/whl/cu128 --index-strategy unsafe-best-match
else
  uv pip install --python "$engine/.venv/bin/python" \
    -r "$app/requirements.txt" "$engine/CosyVoice/third_party/PyWorld" \
    'torch==2.7.0+cu128' 'torchaudio==2.7.0+cu128' \
    --extra-index-url https://download.pytorch.org/whl/cu128 --index-strategy unsafe-best-match
  uv pip freeze --python "$engine/.venv/bin/python" > "$engine/environment.txt"
fi

"$root/runtime/.venv/bin/python" - "$engine" <<'PY'
import hashlib
import json
from pathlib import Path
import sys
from huggingface_hub import snapshot_download

engine = Path(sys.argv[1])
revision = "29e01c4e8d000f4bcd70751be16fa94bf3d85a18"
pin = engine / "model-revision.txt"
if pin.exists() and pin.read_text().strip() != revision:
    raise SystemExit("CosyVoice model pin conflicts with the installed app recipe.")
pin.write_text(revision + "\n")
model = engine / "CosyVoice/pretrained_models/Fun-CosyVoice3-0.5B"
snapshot_download("FunAudioLLM/Fun-CosyVoice3-0.5B-2512", revision=revision, local_dir=model,
    allow_patterns=["cosyvoice3.yaml", "config.json", "configuration.json", "campplus.onnx",
                    "speech_tokenizer_v3.onnx", "llm.pt", "flow.pt", "hift.pt", "CosyVoice-BlankEN/*"])
required = ["cosyvoice3.yaml", "campplus.onnx", "speech_tokenizer_v3.onnx", "llm.pt", "flow.pt", "hift.pt", "CosyVoice-BlankEN/config.json"]
if any(not (model / name).is_file() for name in required):
    raise SystemExit("CosyVoice 3 model download is incomplete.")
record = {"engine": "cosyvoice3", "model_id": "FunAudioLLM/Fun-CosyVoice3-0.5B-2512",
          "model_revision": revision, "source_pins": json.loads((engine / "source-pins.json").read_text()),
          "environment_sha256": hashlib.sha256((engine / "environment.txt").read_bytes()).hexdigest(),
          "sidecar_sha256": hashlib.sha256((engine / "voice-studio-backend/engines/cosyvoice_subprocess/main.py").read_bytes()).hexdigest(),
          "requirements_sha256": hashlib.sha256((engine / "voice-studio-backend/engines/cosyvoice_subprocess/requirements.txt").read_bytes()).hexdigest()}
(engine / "model-download.json").write_text(json.dumps(record, indent=2) + "\n")
PY

# Same import probe as the installed app; no model inference on the CPU queue.
"$engine/.venv/bin/python" - "$engine" <<'PY'
import json
from pathlib import Path
import sys
engine = Path(sys.argv[1])
checkout = engine / "CosyVoice"
sys.path[:0] = [str(checkout), str(checkout / "third_party/Matcha-TTS")]
from cosyvoice.cli.cosyvoice import AutoModel
import cosyvoice.dataset.processor
import matcha.utils
record = json.loads((engine / "model-download.json").read_text())
temporary = engine / ".ready.json.tmp"
temporary.write_text(json.dumps(record, indent=2) + "\n")
temporary.replace(engine / "ready.json")
print("Voice Studio's pinned native CosyVoice 3 comparison environment is ready.")
PY

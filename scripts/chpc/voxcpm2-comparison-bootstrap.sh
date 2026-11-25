#!/usr/bin/env bash
# Experimental Voice Studio VoxCPM2 environment; keeps the OmniVoice runtime intact.
#SBATCH --job-name=nm-voxcpm2-setup
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --time=00:30:00
set -euo pipefail
umask 077
[[ -n "${SLURM_JOB_ID:-}" ]] || { echo 'Submit with sbatch.' >&2; exit 1; }
root=${1:?Usage: voxcpm2-comparison-bootstrap.sh ABSOLUTE_ROOT}
[[ "$root" = /* ]] || exit 1
engine="$root/voxcpm2"
source_dir="$engine/voice-studio-backend"
[[ -f "$source_dir/engines/voxcpm2_subprocess/main.py" ]] || {
  echo 'Copy the installed Voice Studio backend sources before setup.' >&2; exit 1;
}
if ! command -v uv >/dev/null 2>&1; then
  if ! type module >/dev/null 2>&1 && [[ -r /etc/profile.d/modules.sh ]]; then
    source /etc/profile.d/modules.sh
  fi
  module load uv/0.11.14
fi
export UV_CACHE_DIR="$root/cache/uv"
export UV_PYTHON_INSTALL_DIR="$root/tools/python"
export HF_HOME="$root/cache/huggingface"
mkdir -p "$engine" "$UV_CACHE_DIR" "$HF_HOME"
[[ -x "$engine/.venv/bin/python" ]] || uv venv --python 3.11 "$engine/.venv"
if [[ -s "$engine/environment.txt" ]]; then
  uv pip sync --python "$engine/.venv/bin/python" "$engine/environment.txt" \
    --extra-index-url https://download.pytorch.org/whl/cu128 --index-strategy unsafe-best-match
else
  # Exact installed Voice Studio 0.5.7 sidecar recipe, selected explicitly for CUDA.
  uv pip install --python "$engine/.venv/bin/python" \
    'voxcpm==2.0.3' 'torch==2.11.0+cu128' 'torchaudio==2.11.0+cu128' \
    --extra-index-url https://download.pytorch.org/whl/cu128 --index-strategy unsafe-best-match
  uv pip freeze --python "$engine/.venv/bin/python" > "$engine/environment.txt"
fi
"$engine/.venv/bin/python" - "$engine" <<'PY'
import hashlib
import importlib.metadata
import json
import re
import sys
from pathlib import Path

from huggingface_hub import HfApi, snapshot_download

engine = Path(sys.argv[1])
assert importlib.metadata.version("voxcpm") == "2.0.3"
pin = engine / "model-revision.txt"
revision = pin.read_text().strip() if pin.exists() else HfApi().model_info("openbmb/VoxCPM2").sha
if not revision or not re.fullmatch(r"[a-f0-9]{40}", revision):
    raise SystemExit("A full immutable VoxCPM2 model revision is required.")
if not pin.exists():
    with pin.open("x") as stream:
        stream.write(revision + "\n")
snapshot_download("openbmb/VoxCPM2", revision=revision, local_dir=engine / "model")
files = {}
for path in sorted((engine / "voice-studio-backend").rglob("*.py")):
    files[str(path.relative_to(engine))] = hashlib.sha256(path.read_bytes()).hexdigest()
record = {
    "model_id": "openbmb/VoxCPM2", "model_revision": revision,
    "voxcpm_version": importlib.metadata.version("voxcpm"),
    "torch_version": importlib.metadata.version("torch"),
    "sources": files,
    "environment_sha256": hashlib.sha256((engine / "environment.txt").read_bytes()).hexdigest(),
}
temporary = engine / ".ready.json.tmp"
temporary.write_text(json.dumps(record, indent=2) + "\n")
temporary.replace(engine / "ready.json")
print(f"Voice Studio VoxCPM2 comparison ready: {revision}")
PY

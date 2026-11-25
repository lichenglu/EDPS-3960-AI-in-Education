#!/usr/bin/env bash
# Account and partition are selected explicitly by the submission helper.
#SBATCH --job-name=next-move-narration
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --gres=gpu:h200_1g.18gb:1
#SBATCH --time=00:30:00
set -euo pipefail
umask 077

[[ -n "${SLURM_JOB_ID:-}" ]] || { echo 'Submit with sbatch.' >&2; exit 1; }
root=${1:?Usage: render-narration.sbatch ABSOLUTE_REMOTE_ROOT BATCH_ID}
batch_id=${2:?Batch ID is required.}
[[ "$root" = /* && "$batch_id" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$ ]] || {
  echo 'Use an absolute remote root and a safe batch ID.' >&2; exit 1;
}
runtime="$root/runtime"
batch="$root/batches/$batch_id"
python="$runtime/.venv/bin/python"
cli="$runtime/.venv/bin/omnivoice-infer-batch"
[[ -x "$python" && -x "$cli" && -f "$root/model-ready.json" ]] || {
  echo 'Run the VoiceStudio setup job successfully before narration.' >&2; exit 1;
}
export HF_HOME="$root/cache/huggingface"
export HF_HUB_OFFLINE=1
export TRANSFORMERS_OFFLINE=1
export OMP_NUM_THREADS="${SLURM_CPUS_PER_TASK:-4}"
cd "$batch"

# Validate before allowing the CLI to read personal reference audio or run a model.
"$python" - "$root" <<'PY'
import hashlib
import json
import re
import sys
from pathlib import Path

root = Path(sys.argv[1])
meta = json.loads(Path("metadata.json").read_text())
if meta.get("version") != 1:
    raise SystemExit("Unsupported narration package version.")
if not ((meta.get("purpose") == "smoke-test" and meta.get("approved") is False)
        or (meta.get("purpose") == "production" and meta.get("approved") is True)):
    raise SystemExit("Production narration requires an explicitly approved package.")
for path, field in (("reference.wav", "reference_sha256"), ("narration.jsonl", "input_sha256")):
    if hashlib.sha256(Path(path).read_bytes()).hexdigest() != meta.get(field):
        raise SystemExit(f"Package integrity check failed: {path}")
rows = [json.loads(line) for line in Path("narration.jsonl").read_text().splitlines() if line.strip()]
ids = [row.get("id") for row in rows]
if not rows or len(ids) != len(set(ids)) or ids != meta.get("clip_ids") or len(ids) != meta.get("clip_count"):
    raise SystemExit("Manifest clip IDs do not match package metadata.")
for row in rows:
    if not isinstance(row["id"], str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", row["id"]):
        raise SystemExit("Unsafe clip ID.")
    if row.get("ref_audio") != "reference.wav" or not isinstance(row.get("ref_text"), str) or not row["ref_text"].strip():
        raise SystemExit("Every clip must use the packaged clone audio and exact reference transcript.")
    if not isinstance(row.get("text"), str) or not row["text"].strip() or row.get("instruct"):
        raise SystemExit("Every clip must have text and must not replace cloning with voice design.")
    if row.get("duration") is not None or row.get("speed", 1) != 1:
        raise SystemExit("Keep natural clone pacing: duration override and speed changes are disabled.")
ready = json.loads((root / "model-ready.json").read_text())
if ready.get("model_id") != "k2-fsa/OmniVoice" or ready.get("model_revision") != (root / "model-revision.txt").read_text().strip():
    raise SystemExit("Model provenance mismatch; rerun setup.")
for name, field in (("pyproject.toml", "pyproject_sha256"), ("uv.lock", "uv_lock_sha256"),
                    ("omnivoice/cli/infer_batch.py", "cli_sha256"),
                    ("omnivoice/models/omnivoice.py", "model_code_sha256")):
    if hashlib.sha256((root / "runtime" / name).read_bytes()).hexdigest() != ready.get(field):
        raise SystemExit("VoiceStudio runtime changed after setup; rerun setup.")
PY

nvidia-smi
"$python" - <<'PY'
import os
import torch
if not torch.cuda.is_available() or torch.cuda.device_count() != 1:
    raise SystemExit("Exactly one allocated CUDA GPU is required; CPU fallback is disabled.")
name = torch.cuda.get_device_name(0)
if "H200" not in name.upper():
    raise SystemExit(f"Expected an allocated H200, found {name}.")
print(f"VoiceStudio inference device: {name}; allocated host memory: {os.environ.get('SLURM_MEM_PER_NODE', 'unknown')} MB")
PY

results="$batch/results-$SLURM_JOB_ID"
mkdir "$results"
cp "$root/model-ready.json" "$results/model.json"
cp "$root/environment.txt" "$results/environment.txt"
command=("$cli" --model "$root/model" --test_list narration.jsonl --res_dir "$results"
  --num_step 64 --guidance_scale 2 --t_shift 0.1 --preprocess_prompt true
  --denoise true --postprocess_output true --layer_penalty_factor 5
  --position_temperature 5 --class_temperature 0 --nj_per_gpu 1 --batch_size 1)
printf '%s\0' "${command[@]}" > "$results/command.argv"
if [[ -x /usr/bin/time ]]; then
  /usr/bin/time -v -o "$results/resource-usage.txt" "${command[@]}"
else
  "${command[@]}"
fi

# The packaged batch CLI catches worker failures; a zero exit code alone is insufficient.
"$python" - "$results" "$SLURM_JOB_ID" <<'PY'
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

results = Path(sys.argv[1])
meta = json.loads(Path("metadata.json").read_text())
records = []
for clip_id in meta["clip_ids"]:
    path = results / f"{clip_id}.wav"
    audio, rate = sf.read(path, always_2d=True)
    if rate <= 0 or len(audio) == 0 or not np.isfinite(audio).all() or np.max(np.abs(audio)) == 0:
        raise SystemExit(f"Missing, invalid, or silent generated audio: {clip_id}")
    records.append({"id": clip_id, "sample_rate": rate, "frames": len(audio),
                    "channels": audio.shape[1], "seconds": len(audio) / rate,
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
record = {"status": "complete", "job_id": sys.argv[2], "batch_id": Path.cwd().name,
          "purpose": meta["purpose"], "approved": meta["approved"], "num_step": 64,
          "reference_sha256": meta["reference_sha256"], "input_sha256": meta["input_sha256"],
          "model": json.loads((results / "model.json").read_text()), "clips": records}
temporary = results / ".complete.json.tmp"
temporary.write_text(json.dumps(record, indent=2) + "\n")
temporary.replace(results / "complete.json")
print(f"Verified {len(records)} VoiceStudio WAV files in {results}")
PY

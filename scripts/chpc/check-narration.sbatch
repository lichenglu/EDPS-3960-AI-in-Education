#!/usr/bin/env bash
# Independent diagnostic readback; uses CPUs and never changes narration audio.
#SBATCH --job-name=next-move-narration-qa
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --time=00:30:00
set -euo pipefail
umask 077
[[ -n "${SLURM_JOB_ID:-}" ]] || { echo 'Submit with sbatch.' >&2; exit 1; }
root=${1:?Usage: check-narration.sbatch ABSOLUTE_ROOT BATCH_ID GENERATION_JOB_ID}
batch=${2:?Batch ID is required.}
generation_job=${3:?Generation job ID is required.}
[[ "$#" -eq 3 && "$root" = /* && "$batch" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$ && "$generation_job" =~ ^[0-9]+$ ]] || exit 1
[[ -x "$root/runtime/.venv/bin/python" && -f "$root/batches/$batch/results-$generation_job/complete.json" ]] || {
  echo 'The Voice Studio runtime and completed generation results are required.' >&2; exit 1;
}
export OMP_NUM_THREADS="${SLURM_CPUS_PER_TASK:-4}"
export HF_HOME="$root/narration-qa/cache"
export HF_HUB_DISABLE_TELEMETRY=1
# First setup resolves and downloads a pinned small.en model on this CPU node.
unset HF_HUB_OFFLINE TRANSFORMERS_OFFLINE
export CUDA_VISIBLE_DEVICES=""
mkdir -p "$root/logs"
if [[ -x /usr/bin/time ]]; then
  /usr/bin/time -v -o "$root/logs/narration-qa-$SLURM_JOB_ID-resources.txt" \
    "$root/runtime/.venv/bin/python" "$root/scripts/check-narration.py" "$root" "$batch" "$generation_job"
else
  "$root/runtime/.venv/bin/python" "$root/scripts/check-narration.py" "$root" "$batch" "$generation_job"
fi

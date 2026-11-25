#!/usr/bin/env bash
# Listening experiment; does not replace production narration settings.
#SBATCH --job-name=nm-voice-clarity
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --gres=gpu:h200_1g.18gb:1
#SBATCH --time=00:30:00
set -euo pipefail
umask 077
[[ -n "${SLURM_JOB_ID:-}" ]] || { echo 'Submit with sbatch.' >&2; exit 1; }
root=${1:?Remote narration root is required.}
batch=${2:-setup-sample}
export HF_HOME="$root/cache/huggingface"
export HF_HUB_OFFLINE=1
export TRANSFORMERS_OFFLINE=1
export OMP_NUM_THREADS="${SLURM_CPUS_PER_TASK:-4}"
export OMNIVOICE_DATA_DIR="$root/voxcpm2/data"
output="$root/batches/$batch/results-$SLURM_JOB_ID"
exec /usr/bin/time -v -o "$root/logs/$SLURM_JOB_ID.resources.txt" \
  "$root/runtime/.venv/bin/python" "$root/scripts/omnivoice-comparison.py" \
  "$root" "$batch" "$output"

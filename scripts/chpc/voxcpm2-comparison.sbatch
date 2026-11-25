#!/usr/bin/env bash
# Experimental listening comparison; never installs audio in the course.
#SBATCH --job-name=nm-voxcpm2-compare
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --gres=gpu:h200_1g.18gb:1
#SBATCH --time=00:30:00
set -euo pipefail
umask 077
[[ -n "${SLURM_JOB_ID:-}" ]] || { echo 'Submit with sbatch.' >&2; exit 1; }
root=${1:?Usage: voxcpm2-comparison.sbatch ABSOLUTE_ROOT BATCH_ID [default|casual]}
batch=${2:?Batch ID is required.}
[[ "$root" = /* && "$batch" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$ ]] || exit 1
[[ "$#" -le 3 ]] || { echo 'Only one optional comparison variant is accepted.' >&2; exit 2; }
case "${3:-default}" in
  default) extra_args=() ;;
  casual) extra_args=(--casual) ;;
  *) echo 'Comparison variant must be default or casual.' >&2; exit 2 ;;
esac
export OMP_NUM_THREADS="${SLURM_CPUS_PER_TASK:-4}"
export OMNIVOICE_DATA_DIR="$root/voxcpm2/data"
export HF_HOME="$root/cache/huggingface"
export HF_HUB_OFFLINE=1
export TRANSFORMERS_OFFLINE=1
result="$root/batches/$batch/results-$SLURM_JOB_ID"
[[ -f "$root/voxcpm2/ready.json" ]] || { echo 'Run VoxCPM2 setup first.' >&2; exit 1; }
nvidia-smi
if [[ -x /usr/bin/time ]]; then
  /usr/bin/time -v -o "$root/logs/voxcpm2-$SLURM_JOB_ID-resources.txt" \
    "$root/runtime/.venv/bin/python" "$root/scripts/voxcpm2-comparison.py" "$root" "$batch" "$result" "${extra_args[@]}"
else
  "$root/runtime/.venv/bin/python" "$root/scripts/voxcpm2-comparison.py" "$root" "$batch" "$result" "${extra_args[@]}"
fi

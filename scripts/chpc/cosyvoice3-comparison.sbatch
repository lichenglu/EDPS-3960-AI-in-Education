#!/usr/bin/env bash
# Native CosyVoice 3 listening comparison through Voice Studio's sidecar.
#SBATCH --job-name=nm-cosyvoice3-compare
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --gres=gpu:h200_1g.18gb:1
#SBATCH --time=00:30:00
set -euo pipefail
umask 077
[[ -n "${SLURM_JOB_ID:-}" ]] || { echo 'Submit with sbatch.' >&2; exit 1; }
root=${1:?Usage: cosyvoice3-comparison.sbatch ABSOLUTE_ROOT BATCH_ID [EXPERIMENT_JSON]}
batch=${2:?Batch ID is required.}
[[ "$#" -ge 2 && "$#" -le 3 && "$root" = /* && "$batch" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$ ]] || exit 1
experiment_args=()
if [[ "$#" -eq 3 ]]; then
  [[ -f "$3" ]] || { echo 'Experiment JSON is missing.' >&2; exit 1; }
  experiment_args=(--experiment-file "$3")
fi
export OMP_NUM_THREADS="${SLURM_CPUS_PER_TASK:-4}"
export OMNIVOICE_DATA_DIR="$root/cosyvoice3/data"
export HF_HOME="$root/cache/huggingface"
export HF_HUB_OFFLINE=1
export TRANSFORMERS_OFFLINE=1
result="$root/batches/$batch/results-$SLURM_JOB_ID"
[[ -f "$root/cosyvoice3/ready.json" ]] || { echo 'Run CosyVoice 3 setup first.' >&2; exit 1; }
nvidia-smi
if [[ -x /usr/bin/time ]]; then
  /usr/bin/time -v -o "$root/logs/cosyvoice3-$SLURM_JOB_ID-resources.txt" \
    "$root/runtime/.venv/bin/python" "$root/scripts/cosyvoice3-comparison.py" "$root" "$batch" "$result" "${experiment_args[@]}"
else
  "$root/runtime/.venv/bin/python" "$root/scripts/cosyvoice3-comparison.py" "$root" "$batch" "$result" "${experiment_args[@]}"
fi

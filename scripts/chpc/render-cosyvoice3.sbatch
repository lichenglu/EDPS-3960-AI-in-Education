#!/usr/bin/env bash
# Approved course narration through Voice Studio's native CosyVoice 3 sidecar.
#SBATCH --job-name=next-move-cosyvoice3
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --gres=gpu:h200_1g.18gb:1
#SBATCH --time=00:30:00
set -euo pipefail
umask 077
[[ -n "${SLURM_JOB_ID:-}" ]] || { echo 'Submit with sbatch.' >&2; exit 1; }
root=${1:?Usage: render-cosyvoice3.sbatch ABSOLUTE_ROOT BATCH_ID}
batch=${2:?Batch ID is required.}
[[ "$#" -eq 2 && "$root" = /* && "$batch" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$ ]] || exit 1
export OMP_NUM_THREADS="${SLURM_CPUS_PER_TASK:-4}"
export OMNIVOICE_DATA_DIR="$root/cosyvoice3/data"
export HF_HOME="$root/cache/huggingface"
export HF_HUB_OFFLINE=1
export TRANSFORMERS_OFFLINE=1
[[ -f "$root/cosyvoice3/ready.json" && -f "$root/narration-defaults.json" ]] || {
  echo 'Deploy the chosen narration defaults and complete CosyVoice 3 setup first.' >&2; exit 1;
}
mkdir -p "$root/logs"
nvidia-smi
if [[ -x /usr/bin/time ]]; then
  /usr/bin/time -v -o "$root/logs/cosyvoice3-$SLURM_JOB_ID-resources.txt" \
    "$root/runtime/.venv/bin/python" "$root/scripts/render-cosyvoice3.py" "$root" "$batch"
else
  "$root/runtime/.venv/bin/python" "$root/scripts/render-cosyvoice3.py" "$root" "$batch"
fi

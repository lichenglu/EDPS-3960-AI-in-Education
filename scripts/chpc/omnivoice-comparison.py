#!/usr/bin/env python3
"""Experimental OmniVoice clarity/pacing comparison; does not change production defaults."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from datetime import datetime, timezone


COMPARISON_TEXT = (
    "Good teaching starts with listening. When a learner gives an answer, we need "
    "to understand how they reached it. A useful question makes space for their "
    "reasoning, then helps them decide what to try next."
)
HELPERS = (
    "services/text_normalization.py", "services/pronunciation.py", "services/dub_qc.py",
    "services/audio_dsp.py", "core/language_variants.py",
)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path, help="Remote narration root with runtime/ and model/.")
    parser.add_argument("reference_batch", help="Existing private reference batch ID, such as setup-sample.")
    parser.add_argument("output", type=Path, help="New private output directory.")
    parser.add_argument("--text-file", type=Path, help="UTF-8 comparison paragraph; default is the shared lecture test.")
    parser.add_argument("--speed", type=float, default=0.94, help="Model-native speed; default 0.94, no post time-stretch.")
    args = parser.parse_args()
    if not os.environ.get("SLURM_JOB_ID"):
        raise SystemExit("Run this experiment in a Slurm GPU allocation.")
    if not 0.85 <= args.speed <= 1.0:
        raise SystemExit("Comparison speed must be between 0.85 and 1.0.")
    root = args.root.resolve(strict=True)
    runtime = root / "runtime"
    if Path(sys.prefix).resolve() != (runtime / ".venv").resolve():
        raise SystemExit("Use the frozen VoiceStudio runtime/.venv/bin/python for this comparison.")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", args.reference_batch):
        raise SystemExit("Use an existing safe reference batch ID.")
    package = (root / "batches" / args.reference_batch).resolve(strict=True)
    meta = json.loads((package / "metadata.json").read_text())
    manifest_path = package / "narration.jsonl"
    reference = package / "reference.wav"
    if sha256(reference) != meta.get("reference_sha256") or sha256(manifest_path) != meta.get("input_sha256"):
        raise SystemExit("Private reference package hashes do not match.")
    rows = [json.loads(line) for line in manifest_path.read_text().splitlines() if line.strip()]
    if not rows or not isinstance(rows[0].get("ref_text"), str) or not rows[0]["ref_text"].strip():
        raise SystemExit("The original exact reference transcript is required.")
    text = args.text_file.read_text(encoding="utf-8") if args.text_file else COMPARISON_TEXT
    if not text.strip():
        raise SystemExit("Comparison paragraph is empty.")
    backend = root / "voxcpm2/voice-studio-backend"
    missing = [name for name in HELPERS if not (backend / name).is_file()]
    if missing:
        raise SystemExit("Copy the installed VoiceStudio helper files before comparison: " + ", ".join(missing))
    sys.path.insert(0, str(backend))
    os.environ["HF_HOME"] = str(root / "cache/huggingface")
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    from services.text_normalization import normalize_for_tts
    from services.pronunciation import apply_pronunciation

    spoken_text = apply_pronunciation(normalize_for_tts(text, "en"), entries=[], language="en", lexicon={})
    import numpy as np
    import soundfile as sf
    import torch
    import pedalboard  # Required: do not silently skip VoiceStudio's mastering.
    from services.audio_dsp import apply_mastering, apply_effects_chain, get_effect_chain, normalize_audio

    if not torch.cuda.is_available() or torch.cuda.device_count() != 1:
        raise SystemExit("Exactly one allocated CUDA GPU is required; CPU fallback is disabled.")
    device = torch.cuda.get_device_name(0)
    if "H200" not in device.upper():
        raise SystemExit("This experiment is configured for an allocated H200 device.")
    output = args.output.absolute()
    output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    output.mkdir(mode=0o700)  # Retain previous experiments; never overwrite.
    (output / "raw").mkdir(mode=0o700)
    clip_id = "omnivoice-64-speed094" if args.speed == 0.94 else "omnivoice-64-comparison"
    manifest = output / "narration.jsonl"
    manifest.write_text(json.dumps({"id": clip_id, "text": spoken_text,
        "ref_audio": str(reference), "ref_text": rows[0]["ref_text"],
        "language_id": "en", "speed": args.speed}, ensure_ascii=False) + "\n", encoding="utf-8")
    (output / "canonical-text.txt").write_text(text, encoding="utf-8")
    (output / "spoken-text.txt").write_text(spoken_text, encoding="utf-8")
    command = [str(runtime / ".venv/bin/omnivoice-infer-batch"),
        "--model", str(root / "model"), "--test_list", str(manifest),
        "--res_dir", str(output / "raw"), "--num_step", "64", "--guidance_scale", "2",
        "--t_shift", "0.1", "--preprocess_prompt", "true", "--denoise", "true",
        "--postprocess_output", "true", "--layer_penalty_factor", "5",
        "--position_temperature", "5", "--class_temperature", "0",
        "--nj_per_gpu", "1", "--batch_size", "1"]
    (output / "command.json").write_text(json.dumps(command, indent=2) + "\n")
    subprocess.run(command, check=True)
    raw = output / "raw" / f"{clip_id}.wav"
    samples, rate = sf.read(raw, dtype="float32", always_2d=True)
    if not len(samples) or not np.isfinite(samples).all() or np.max(np.abs(samples)) == 0:
        raise SystemExit("The CLI did not produce valid non-silent audio.")
    audio = torch.from_numpy(samples.T.copy())
    # Same non-raw /generate finishing sequence; the OmniVoice engine does not master itself.
    audio = apply_mastering(audio, sample_rate=rate)
    audio = apply_effects_chain(audio, sample_rate=rate, chain=get_effect_chain("broadcast"))
    audio = normalize_audio(audio, target_dBFS=-2.0)
    finished = audio.detach().cpu().numpy().T
    if not np.isfinite(finished).all() or np.max(np.abs(finished)) == 0:
        raise SystemExit("VoiceStudio finishing returned invalid audio.")
    final = output / f"{clip_id}.wav"
    sf.write(final, finished, rate, subtype="PCM_16")
    record = {"status": "complete", "purpose": "experimental-listening-comparison",
        "production_approved": False, "created_at": datetime.now(timezone.utc).isoformat(),
        "job_id": os.environ["SLURM_JOB_ID"], "engine": "VoiceStudio OmniVoice CLI",
        "num_step": 64, "speed": args.speed, "device": device,
        "canonical_text_sha256": sha256(output / "canonical-text.txt"),
        "spoken_text_sha256": sha256(output / "spoken-text.txt"), "reference_sha256": sha256(reference),
        "model": json.loads((root / "model-ready.json").read_text()),
        "app_helper_sha256": {name: sha256(backend / name) for name in HELPERS},
        "finishing": ["VoiceStudio apply_mastering", "VoiceStudio broadcast effect chain", "peak normalization -2 dBFS"],
        "sample_rate": rate, "seconds": len(samples) / rate, "raw_sha256": sha256(raw),
        "output": final.name, "output_sha256": sha256(final),
        "limitations": "A slower pace and mastering do not guarantee pronunciation or accent improvement; listening review required."}
    (output / "complete.json").write_text(json.dumps(record, indent=2) + "\n")
    print(f"Verified experimental comparison: {final}; {len(samples) / rate:.2f}s; listening review pending.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Compare Voice Studio's native CosyVoice 3 plain and casual instructed clones."""

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import selectors
import struct
import subprocess
import sys
import time


TEXT = (
    "Good teaching starts with listening. When a learner gives an answer, "
    "we need to understand how they reached it. A useful question makes space "
    "for their reasoning, then helps them decide what to try next."
)
INSTRUCTION = (
    "Speak warmly and energetically, like sharing an exciting idea with a friend. "
    "Lively expression, clear pronunciation, easygoing phrasing, and natural "
    "pauses. Keep the reference speaker's voice and accent."
)
SOURCE_FILES = (
    "services/audio_dsp.py", "services/text_normalization.py",
    "services/pronunciation.py", "services/dub_qc.py", "core/language_variants.py",
)
MAX_FRAME = 64 * 1024 * 1024
SAFE_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}\Z")


def comparison_variants():
    return (("cosyvoice3-clone", None), ("cosyvoice3-casual-energetic", INSTRUCTION))


def load_experiment(path=None):
    """Read an optional listening experiment without changing production defaults."""
    if path is None:
        return TEXT, "plain-and-casual-energetic", comparison_variants(), None
    contents = Path(path).read_bytes()
    experiment = json.loads(contents)
    if not isinstance(experiment, dict):
        raise ValueError("The experiment must be a JSON object.")
    text = experiment.get("text")
    label = experiment.get("comparison_variant")
    variants = experiment.get("variants")
    if not isinstance(text, str) or not text.strip():
        raise ValueError("The experiment requires nonempty text.")
    if not isinstance(label, str) or not SAFE_ID.fullmatch(label):
        raise ValueError("The experiment comparison_variant must be a safe ID.")
    if not isinstance(variants, list) or not variants:
        raise ValueError("The experiment requires a nonempty variants list.")
    rows, seen = [], set()
    for variant in variants:
        if not isinstance(variant, dict):
            raise ValueError("Each experiment variant must be an object.")
        clip_id = variant.get("id")
        instruction = variant.get("instruct")
        if not isinstance(clip_id, str) or not SAFE_ID.fullmatch(clip_id) or clip_id.casefold() in seen:
            raise ValueError("Experiment variant IDs must be safe and unique, including case.")
        if "instruct" not in variant or (instruction is not None and
                (not isinstance(instruction, str) or not instruction.strip())):
            raise ValueError("Each experiment instruction must be null or a nonempty string.")
        seen.add(clip_id.casefold())
        rows.append((clip_id, instruction))
    return text, label, tuple(rows), hashlib.sha256(contents).hexdigest()


def read_exact(stream, count, timeout=900):
    """Bounded framing read; each healthy progress frame resets the next deadline."""
    output = bytearray()
    deadline = time.monotonic() + timeout
    with selectors.DefaultSelector() as selector:
        selector.register(stream, selectors.EVENT_READ)
        while len(output) < count:
            remaining = deadline - time.monotonic()
            if remaining <= 0 or not selector.select(remaining):
                raise TimeoutError("Voice Studio sidecar stopped responding.")
            chunk = os.read(stream.fileno(), count - len(output))
            if not chunk:
                raise EOFError("Voice Studio sidecar ended before returning audio.")
            output.extend(chunk)
    return bytes(output)


def receive(stream):
    length = struct.unpack("!I", read_exact(stream, 4))[0]
    if length <= 0 or length > MAX_FRAME:
        raise ValueError("Invalid Voice Studio response frame size.")
    return json.loads(read_exact(stream, length))


def send(stream, payload):
    encoded = json.dumps(payload, ensure_ascii=False).encode()
    if len(encoded) > MAX_FRAME:
        raise ValueError("Request is too large.")
    stream.write(struct.pack("!I", len(encoded)) + encoded)
    stream.flush()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path)
    parser.add_argument("batch_id")
    parser.add_argument("results", type=Path)
    parser.add_argument("--experiment-file", type=Path,
                        help="Optional JSON text/variant instructions for a listening comparison")
    args = parser.parse_args()
    if not args.root.is_absolute() or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", args.batch_id):
        parser.error("Use an absolute root and safe batch ID.")
    try:
        original_text, comparison_label, variants, experiment_hash = load_experiment(args.experiment_file)
    except (OSError, ValueError) as error:
        parser.error(str(error))
    os.umask(0o077)
    root = args.root
    if not os.environ.get("SLURM_JOB_ID"):
        raise SystemExit("Submit this experiment in a Slurm GPU allocation.")
    engine = root / "cosyvoice3"
    sources = root / "voxcpm2/voice-studio-backend"
    sidecar = engine / "voice-studio-backend/engines/cosyvoice_subprocess/main.py"
    batch = root / "batches" / args.batch_id
    results = args.results
    meta = json.loads((batch / "metadata.json").read_text())
    if meta.get("purpose") != "smoke-test" or meta.get("approved") is not False:
        raise SystemExit("This comparison runner accepts neutral setup samples only.")
    reference = batch / "reference.wav"
    if hashlib.sha256(reference.read_bytes()).hexdigest() != meta.get("reference_sha256"):
        raise SystemExit("Clone reference hash mismatch.")
    manifest = batch / "narration.jsonl"
    if hashlib.sha256(manifest.read_bytes()).hexdigest() != meta.get("input_sha256"):
        raise SystemExit("Clone transcript manifest hash mismatch.")
    rows = [json.loads(line) for line in manifest.read_text().splitlines() if line.strip()]
    if not rows or not isinstance(rows[0].get("ref_text"), str) or not rows[0]["ref_text"].strip():
        raise SystemExit("The original saved reference transcript is required.")
    transcript = rows[0]["ref_text"]
    ready = json.loads((engine / "ready.json").read_text())
    if ready.get("model_id") != "FunAudioLLM/Fun-CosyVoice3-0.5B-2512" or ready.get("model_revision") != (engine / "model-revision.txt").read_text().strip():
        raise SystemExit("CosyVoice 3 model provenance mismatch.")
    if hashlib.sha256((engine / "environment.txt").read_bytes()).hexdigest() != ready.get("environment_sha256"):
        raise SystemExit("CosyVoice 3 environment record changed after setup.")
    if hashlib.sha256(sidecar.read_bytes()).hexdigest() != ready.get("sidecar_sha256"):
        raise SystemExit("Voice Studio's CosyVoice sidecar changed after setup.")
    helper_hashes = {name: hashlib.sha256((sources / name).read_bytes()).hexdigest()
                     for name in SOURCE_FILES}
    sys.path.insert(0, str(sources))
    # These are the installed Voice Studio processing functions, not replacements.
    import numpy as np
    import soundfile as sf
    import torch
    from services.audio_dsp import apply_mastering, normalize_audio, trim_trailing_silence
    from services.pronunciation import apply_pronunciation
    from services.text_normalization import normalize_for_tts

    if not torch.cuda.is_available() or torch.cuda.device_count() != 1:
        raise SystemExit("One allocated CUDA GPU is required; CPU fallback is disabled.")
    device = torch.cuda.get_device_name(0)
    if "H200" not in device.upper():
        raise SystemExit(f"Expected H200, found {device}.")
    text = apply_pronunciation(normalize_for_tts(original_text, "en"), entries=[], language="en", lexicon={})
    prepared = {"ref_audio": str(reference), "ref_text": transcript}
    results.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    results.mkdir(mode=0o700)
    environment = os.environ.copy()
    environment.update({"OMNIVOICE_COSYVOICE_DIR": str(engine / "CosyVoice"),
                        "OMNIVOICE_COSYVOICE_MODEL": str(engine / "CosyVoice/pretrained_models/Fun-CosyVoice3-0.5B"),
                        "HF_HOME": str(root / "cache/huggingface"),
                        "HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1"})
    command = [str(engine / ".venv/bin/python"), str(sidecar)]
    records = []
    child_vram_mb = None
    started = time.monotonic()
    with (results / "sidecar.log").open("wb") as log:
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log,
                                   env=environment, bufsize=0)
        try:
            frame = receive(process.stdout)
            if frame.get("op") != "ready" or frame.get("engine") != "cosyvoice":
                raise RuntimeError("Unexpected Voice Studio sidecar handshake.")
            for clip_id, instruction in variants:
                payload = {"op": "synthesize", "text": text, **prepared,
                           "seed": 3960, "language": "en"}
                if instruction:
                    payload["instruct"] = instruction
                begin = time.monotonic()
                send(process.stdin, payload)
                while True:
                    frame = receive(process.stdout)
                    if frame.get("op") == "progress":
                        print(f"{clip_id}: {frame.get('stage', 'working')}", flush=True)
                        continue
                    if frame.get("op") == "error":
                        raise RuntimeError(f"Voice Studio sidecar: {frame.get('message')}")
                    if frame.get("op") == "audio":
                        break
                    raise RuntimeError("Unexpected Voice Studio response.")
                if frame.get("sample_rate") != 24000:
                    raise ValueError("Unexpected native CosyVoice 3 audio rate.")
                audio = np.frombuffer(base64.b64decode(frame["audio_pcm_b64"], validate=True), dtype="<i2").astype(np.float32) / 32768.0
                if len(audio) != frame.get("n_samples") or not len(audio) or not np.isfinite(audio).all() or np.max(np.abs(audio)) == 0:
                    raise ValueError("Missing, invalid, or silent CosyVoice 3 audio.")
                rate = frame["sample_rate"]
                sf.write(results / f"{clip_id}-raw.wav", audio, rate, subtype="PCM_16")
                tensor = trim_trailing_silence(torch.from_numpy(audio).unsqueeze(0), rate)
                # CosyVoice does not declare native mastering. Use the app's
                # gentle core chain; no broadcast EQ, reverb or pitch conversion.
                tensor = apply_mastering(tensor, sample_rate=rate)
                tensor = normalize_audio(tensor, target_dBFS=-2.0)
                final = tensor.detach().cpu().numpy().reshape(-1)
                if not np.isfinite(final).all() or len(final) == 0 or np.max(np.abs(final)) == 0:
                    raise ValueError("Voice Studio processing produced invalid audio.")
                path = results / f"{clip_id}.wav"
                sf.write(path, final, rate, subtype="PCM_16")
                records.append({"id": clip_id, "instruct": instruction,
                                "text": original_text,
                                "text_sha256": hashlib.sha256(original_text.encode("utf-8")).hexdigest(),
                                "spoken_text": text,
                                "spoken_text_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
                                "native_sampling": "Voice Studio CosyVoice 3 defaults", "seed": 3960,
                                "mode": "inference_instruct2" if instruction else "inference_zero_shot",
                                "reference_transcript_used_by_model": not bool(instruction),
                                "seconds": len(final) / rate, "sample_rate": rate,
                                "elapsed_seconds_including_first_model_load": time.monotonic() - begin,
                                "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
                print(f"Verified {clip_id}: {len(final) / rate:.2f}s", flush=True)
            send(process.stdin, {"op": "ping"})
            frame = receive(process.stdout)
            child_vram_mb = frame.get("vram_mb")
            if (frame.get("op") != "pong" or not isinstance(child_vram_mb, (int, float))
                    or not child_vram_mb > 0):
                raise RuntimeError("CosyVoice 3 sidecar did not confirm resident CUDA allocations.")
            print(f"Voice Studio sidecar CUDA allocation: {child_vram_mb:.1f} MiB", flush=True)
        finally:
            if process.stdin:
                process.stdin.close()
            try:
                process.wait(timeout=20)
            except subprocess.TimeoutExpired:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
    if process.returncode != 0:
        raise RuntimeError(f"Voice Studio sidecar exited with {process.returncode}.")
    record = {"status": "complete", "purpose": "smoke-test", "approved": False,
              "engine": "cosyvoice3", "device": device, "model": ready,
              "batch_id": args.batch_id, "clip_count": len(records),
              "comparison_variant": comparison_label,
              "experiment_sha256": experiment_hash,
              "comparison_variants": [{"id": clip_id, "instruct": instruction}
                                      for clip_id, instruction in variants],
              "reference_sha256": meta["reference_sha256"], "input_sha256": meta["input_sha256"],
              "original_text": original_text, "normalized_text": text,
              "pronunciation_entries": [], "effect_preset": "none",
              "generic_mastering_applied": True,
              "app_helper_sha256": helper_hashes,
              "job_id": os.environ["SLURM_JOB_ID"],
              "sidecar_vram_mb": child_vram_mb,
              "total_seconds": time.monotonic() - started, "clips": records}
    temporary = results / ".complete.json.tmp"
    temporary.write_text(json.dumps(record, indent=2) + "\n")
    temporary.replace(results / "complete.json")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Compare Voice Studio's native VoxCPM2 clone and controllable-clone modes."""

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
    "Clear articulation, relaxed conversational delivery, natural pauses and "
    "sentence emphasis. Retain the reference speaker's voice and accent."
)
CASUAL_INSTRUCTION = (
    "Talk like you're excited to share an idea with a friend. Warm, lively and "
    "upbeat, with clear pronunciation, expressive pitch, and natural pauses. "
    "Keep it conversational and retain the reference speaker's voice and accent."
)
SOURCE_FILES = (
    "engines/voxcpm2_subprocess/main.py", "services/tts_backend.py",
    "services/audio_dsp.py", "services/text_normalization.py",
    "services/pronunciation.py", "services/dub_qc.py", "core/language_variants.py",
)
MAX_FRAME = 64 * 1024 * 1024


def comparison_variants(casual=False):
    if casual:
        return (("voxcpm2-casual-energetic", CASUAL_INSTRUCTION),)
    return (("voxcpm2-clone", None), ("voxcpm2-clear", INSTRUCTION))


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
    parser.add_argument("--casual", action="store_true",
                        help="Render one warm, casual, energetic guided sample; keep the same paragraph and reference.")
    args = parser.parse_args()
    if not args.root.is_absolute() or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", args.batch_id):
        parser.error("Use an absolute root and safe batch ID.")
    os.umask(0o077)
    root = args.root
    engine = root / "voxcpm2"
    sources = engine / "voice-studio-backend"
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
    if ready.get("model_id") != "openbmb/VoxCPM2" or ready.get("model_revision") != (engine / "model-revision.txt").read_text().strip():
        raise SystemExit("VoxCPM2 model provenance mismatch.")
    if hashlib.sha256((engine / "environment.txt").read_bytes()).hexdigest() != ready.get("environment_sha256"):
        raise SystemExit("VoxCPM2 environment record changed after setup.")
    for relative in SOURCE_FILES:
        key = "voice-studio-backend/" + relative
        if hashlib.sha256((sources / relative).read_bytes()).hexdigest() != ready["sources"].get(key):
            raise SystemExit(f"Voice Studio source changed after setup: {relative}")
    sys.path.insert(0, str(sources))
    # These are the installed Voice Studio processing functions, not replacements.
    import numpy as np
    import soundfile as sf
    import torch
    from services.audio_dsp import normalize_audio, trim_trailing_silence
    from services.pronunciation import apply_pronunciation
    from services.text_normalization import normalize_for_tts
    from services.tts_backend import prepare_voxcpm_reference

    if not torch.cuda.is_available() or torch.cuda.device_count() != 1:
        raise SystemExit("One allocated CUDA GPU is required; CPU fallback is disabled.")
    device = torch.cuda.get_device_name(0)
    if "H200" not in device.upper():
        raise SystemExit(f"Expected H200, found {device}.")
    text = apply_pronunciation(normalize_for_tts(TEXT, "en"), entries=[], language="en", lexicon={})
    prepared = {"ref_audio": str(reference), "ref_text": transcript}
    prepare_voxcpm_reference(prepared)
    results.mkdir(mode=0o700)
    environment = os.environ.copy()
    environment.update({"OMNIVOICE_VOXCPM_MODEL": str(engine / "model"),
                        "HF_HOME": str(root / "cache/huggingface"),
                        "HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1"})
    command = [str(engine / ".venv/bin/python"), str(sources / "engines/voxcpm2_subprocess/main.py")]
    records = []
    child_vram_mb = None
    started = time.monotonic()
    with (results / "sidecar.log").open("wb") as log:
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log,
                                   env=environment, bufsize=0)
        try:
            frame = receive(process.stdout)
            if frame.get("op") != "ready" or frame.get("engine") != "voxcpm2":
                raise RuntimeError("Unexpected Voice Studio sidecar handshake.")
            for clip_id, instruction in comparison_variants(args.casual):
                payload = {"op": "synthesize", "text": text, **prepared,
                           "num_step": 10, "guidance_scale": 2.0,
                           "seed": 3960, "audio_format": "f32le"}
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
                if frame.get("audio_format") != "f32le" or frame.get("sample_rate") != 48000:
                    raise ValueError("Unexpected native VoxCPM2 audio format.")
                audio = np.frombuffer(base64.b64decode(frame["audio_pcm_b64"], validate=True), dtype="<f4").copy()
                if len(audio) != frame.get("n_samples") or not len(audio) or not np.isfinite(audio).all() or np.max(np.abs(audio)) == 0:
                    raise ValueError("Missing, invalid, or silent VoxCPM2 audio.")
                rate = frame["sample_rate"]
                sf.write(results / f"{clip_id}-raw.wav", audio, rate, subtype="PCM_24")
                tensor = trim_trailing_silence(torch.from_numpy(audio).unsqueeze(0), rate)
                # VoxCPM2 declares its own mastering. Keep this listening test
                # neutral: actual app tail trimming and benign peak normalization,
                # without an added compressor, EQ, or reverberation preset.
                tensor = normalize_audio(tensor, target_dBFS=-2.0)
                final = tensor.detach().cpu().numpy().reshape(-1)
                if not np.isfinite(final).all() or len(final) == 0 or np.max(np.abs(final)) == 0:
                    raise ValueError("Voice Studio processing produced invalid audio.")
                path = results / f"{clip_id}.wav"
                sf.write(path, final, rate, subtype="PCM_24")
                records.append({"id": clip_id, "instruct": instruction,
                                "native_steps": 10, "guidance_scale": 2.0, "seed": 3960,
                                "mode": "controllable-clone" if instruction else "continuation-clone",
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
                raise RuntimeError("VoxCPM2 sidecar did not confirm resident CUDA allocations.")
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
              "engine": "voxcpm2", "device": device, "model": ready,
              "comparison_variant": "casual-energetic" if args.casual else "clone-and-clear",
              "reference_sha256": meta["reference_sha256"], "input_sha256": meta["input_sha256"],
              "original_text": TEXT, "normalized_text": text,
              "pronunciation_entries": [], "effect_preset": "raw",
              "generic_mastering_applied": False,
              "sidecar_vram_mb": child_vram_mb,
              "total_seconds": time.monotonic() - started, "clips": records}
    temporary = results / ".complete.json.tmp"
    temporary.write_text(json.dumps(record, indent=2) + "\n")
    temporary.replace(results / "complete.json")


if __name__ == "__main__":
    main()

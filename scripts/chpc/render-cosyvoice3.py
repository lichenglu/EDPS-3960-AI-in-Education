#!/usr/bin/env python3
"""Render an approved narration batch with Voice Studio's chosen CosyVoice 3 voice."""

import argparse
import base64
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import re
import selectors
import struct
import subprocess
import sys
import time


MODEL_ID = "FunAudioLLM/Fun-CosyVoice3-0.5B-2512"
MODEL_REVISION = "29e01c4e8d000f4bcd70751be16fa94bf3d85a18"
RATE = 24000
SAFE_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}\Z")
HELPERS = (
    "services/audio_dsp.py", "services/text_normalization.py",
    "services/pronunciation.py", "services/dub_qc.py", "core/language_variants.py",
)
MAX_FRAME = 64 * 1024 * 1024


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def text_sha256(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_package(root, batch_id, config_path):
    """Validate private inputs and pinned runtime before importing a model library."""
    if not root.is_absolute() or not SAFE_ID.fullmatch(batch_id):
        raise ValueError("Use an absolute narration root and a safe batch ID.")
    batch = root / "batches" / batch_id
    meta = json.loads((batch / "metadata.json").read_text(encoding="utf-8"))
    if meta.get("version") != 1 or meta.get("purpose") != "production" or meta.get("approved") is not True:
        raise ValueError("This renderer requires a version 1, explicitly approved production batch.")
    reference = batch / "reference.wav"
    manifest = batch / "narration.jsonl"
    for path, field in ((reference, "reference_sha256"), (manifest, "input_sha256")):
        if sha256(path) != meta.get(field):
            raise ValueError(f"Private narration package hash mismatch: {path.name}")
    rows = []
    for number, line in enumerate(manifest.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid JSON on narration line {number}.") from error
        if not isinstance(row, dict):
            raise ValueError(f"Narration line {number} must be an object.")
        clip_id, text = row.get("id"), row.get("text")
        if not isinstance(clip_id, str) or not SAFE_ID.fullmatch(clip_id):
            raise ValueError(f"Unsafe clip ID on narration line {number}.")
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"Missing text for {clip_id}.")
        if row.get("ref_audio") != "reference.wav" or not isinstance(row.get("ref_text"), str) or not row["ref_text"].strip():
            raise ValueError(f"Use the packaged reference and exact reference transcript for {clip_id}.")
        if row.get("duration") is not None or row.get("speed", 1) != 1 or row.get("instruct"):
            raise ValueError("Per-clip duration, speed and style overrides are disabled; use the chosen voice configuration.")
        language = row.get("language_id", "en")
        if not isinstance(language, str) or not language.strip():
            raise ValueError(f"Invalid language for {clip_id}.")
        rows.append(row)
    ids = [row["id"] for row in rows]
    if not ids or len(ids) != len({value.casefold() for value in ids}):
        raise ValueError("Narration clip IDs must be nonempty and unique, including case.")
    if ids != meta.get("clip_ids") or len(ids) != meta.get("clip_count"):
        raise ValueError("Narration clip IDs/count do not match approved package metadata.")
    if len({row["ref_text"] for row in rows}) != 1:
        raise ValueError("All clips in this voice batch must retain the same exact reference transcript.")

    config = json.loads(config_path.read_text(encoding="utf-8"))
    if config.get("engine") != "cosyvoice3" or config.get("model_id") != MODEL_ID or config.get("model_revision") != MODEL_REVISION:
        raise ValueError("The default configuration must select the approved native CosyVoice 3 checkpoint.")
    if config.get("schema_version", 1) != 1 or config.get("sample_rate", RATE) != RATE:
        raise ValueError("Use voice configuration schema 1 and native 24000 Hz output.")
    if not isinstance(config.get("instruct"), str) or not config["instruct"].strip():
        raise ValueError("The approved delivery instruction is required.")
    seed = config.get("seed")
    if isinstance(seed, bool) or not isinstance(seed, int) or not 0 <= seed < 2**63:
        raise ValueError("The voice configuration requires a nonnegative integer seed below 2**63.")
    reference_pin = config.get("reference_sha256")
    if reference_pin is not None:
        if not isinstance(reference_pin, str) or not re.fullmatch(r"[a-f0-9]{64}", reference_pin) or reference_pin != meta["reference_sha256"]:
            raise ValueError("The prepared reference does not match the approved voice's SHA-256 fingerprint.")
    if config.get("voice_profile_id") and config["voice_profile_id"] != meta.get("voice_id") and reference_pin is None:
        raise ValueError("The prepared reference voice does not match the selected voice profile; supply its approved reference fingerprint when reusing an exported reference.")

    engine = root / "cosyvoice3"
    ready = json.loads((engine / "ready.json").read_text(encoding="utf-8"))
    sidecar = engine / "voice-studio-backend/engines/cosyvoice_subprocess/main.py"
    if ready.get("model_id") != MODEL_ID or ready.get("model_revision") != MODEL_REVISION:
        raise ValueError("Installed CosyVoice 3 model provenance does not match the selected voice.")
    if (engine / "model-revision.txt").read_text().strip() != MODEL_REVISION:
        raise ValueError("CosyVoice 3 model revision pin changed after setup.")
    for path, field in ((engine / "environment.txt", "environment_sha256"),
                        (sidecar, "sidecar_sha256"),
                        (sidecar.parent / "requirements.txt", "requirements_sha256")):
        if sha256(path) != ready.get(field):
            raise ValueError(f"CosyVoice 3 runtime changed after setup: {path.name}")
    for source in ready.get("source_pins", []):
        marker = engine / source["path"] / ".voice-studio-source-revision"
        if marker.read_text().strip() != source["revision"]:
            raise ValueError("CosyVoice source revision changed after setup.")
    model = engine / "CosyVoice/pretrained_models/Fun-CosyVoice3-0.5B"
    for name in ("cosyvoice3.yaml", "campplus.onnx", "speech_tokenizer_v3.onnx", "llm.pt", "flow.pt", "hift.pt", "CosyVoice-BlankEN/config.json"):
        if not (model / name).is_file():
            raise ValueError(f"CosyVoice model is incomplete: {name}")
    if not (engine / ".venv/bin/python").is_file():
        raise ValueError("The isolated CosyVoice interpreter is missing.")
    sources = root / "voxcpm2/voice-studio-backend"
    helper_hashes = {name: sha256(sources / name) for name in HELPERS}
    provenance_path = sources.parent / "voice-studio-source.json"
    if provenance_path.is_file():
        expected = json.loads(provenance_path.read_text())["source_files"]
        if any(expected.get(name) != digest for name, digest in helper_hashes.items()):
            raise ValueError("Copied Voice Studio audio/text helpers changed after deployment.")
    return batch, meta, rows, reference, config, ready, sidecar, sources, helper_hashes


def read_exact(stream, count, timeout=900):
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
    value = json.loads(read_exact(stream, length))
    if not isinstance(value, dict):
        raise ValueError("Voice Studio response must be an object.")
    return value


def send(stream, payload):
    encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    if len(encoded) > MAX_FRAME:
        raise ValueError("Narration request is too large.")
    stream.write(struct.pack("!I", len(encoded)) + encoded)
    stream.flush()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path)
    parser.add_argument("batch_id")
    parser.add_argument("--config", type=Path, help="Defaults to ROOT/narration-defaults.json.")
    parser.add_argument("--validate-only", action="store_true", help="Check package/config/runtime provenance without importing model libraries.")
    args = parser.parse_args()
    os.umask(0o077)
    root = args.root
    config_path = args.config or root / "narration-defaults.json"
    batch, meta, rows, reference, config, ready, sidecar, sources, helper_hashes = load_package(root, args.batch_id, config_path)
    if args.validate_only:
        print(f"Validated approved CosyVoice 3 package: {args.batch_id}, {len(rows)} clips.")
        return
    job_id = os.environ.get("SLURM_JOB_ID")
    if not job_id or not job_id.isdigit():
        raise SystemExit("Submit this renderer inside a Slurm GPU allocation.")
    if Path(sys.prefix).resolve() != (root / "runtime/.venv").resolve():
        raise SystemExit("Use ROOT/runtime/.venv/bin/python for Voice Studio's processing helpers.")
    sys.path.insert(0, str(sources))
    import numpy as np
    import soundfile as sf
    import torch
    import pedalboard  # Required for the same gentle mastering used in the selected sample.
    from services.audio_dsp import apply_mastering, normalize_audio, trim_trailing_silence
    from services.pronunciation import apply_pronunciation
    from services.text_normalization import normalize_for_tts

    if not torch.cuda.is_available() or torch.cuda.device_count() != 1:
        raise SystemExit("Exactly one allocated CUDA GPU is required; CPU fallback is disabled.")
    device = torch.cuda.get_device_name(0)
    if "H200" not in device.upper():
        raise SystemExit(f"Expected an allocated H200, found {device}.")
    results = batch / f"results-{job_id}"
    results.mkdir(mode=0o700)  # Never overwrite a previous job's masters.
    (results / "raw").mkdir(mode=0o700)
    (results / "voice-settings.json").write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n")
    environment = os.environ.copy()
    environment.update({
        "OMNIVOICE_COSYVOICE_DIR": str(root / "cosyvoice3/CosyVoice"),
        "OMNIVOICE_COSYVOICE_MODEL": str(root / "cosyvoice3/CosyVoice/pretrained_models/Fun-CosyVoice3-0.5B"),
        "HF_HOME": str(root / "cache/huggingface"),
        "HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1",
    })
    command = [str(root / "cosyvoice3/.venv/bin/python"), str(sidecar)]
    (results / "command.json").write_text(json.dumps(command, indent=2) + "\n")
    records = []
    child_vram_mb = None
    started = time.monotonic()
    with (results / "sidecar.log").open("wb") as log:
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                   stderr=log, env=environment, bufsize=0)
        try:
            frame = receive(process.stdout)
            if frame.get("op") != "ready" or frame.get("engine") != "cosyvoice":
                raise RuntimeError("Unexpected Voice Studio CosyVoice sidecar handshake.")
            for index, row in enumerate(rows, 1):
                clip_id = row["id"]
                canonical = row["text"]
                language = row.get("language_id", "en")
                spoken = apply_pronunciation(normalize_for_tts(canonical, language), entries=[], language=language, lexicon={})
                if not spoken.strip():
                    raise ValueError(f"Text processing produced empty narration: {clip_id}")
                payload = {"op": "synthesize", "text": spoken, "ref_audio": str(reference),
                           "ref_text": row["ref_text"], "instruct": config["instruct"],
                           "seed": config["seed"], "language": language}
                begin = time.monotonic()
                print(f"Rendering {index}/{len(rows)}: {clip_id}", flush=True)
                send(process.stdin, payload)
                while True:
                    frame = receive(process.stdout)
                    if frame.get("op") == "progress":
                        print(f"{clip_id}: {frame.get('stage', 'working')}", flush=True)
                        continue
                    if frame.get("op") == "error":
                        raise RuntimeError(f"Voice Studio failed for {clip_id}: {frame.get('message')}")
                    if frame.get("op") == "audio":
                        break
                    raise RuntimeError("Unexpected Voice Studio response.")
                if frame.get("sample_rate") != RATE:
                    raise ValueError(f"Unexpected native audio rate for {clip_id}.")
                encoded = base64.b64decode(frame["audio_pcm_b64"], validate=True)
                if len(encoded) % 2:
                    raise ValueError(f"Invalid PCM byte count for {clip_id}.")
                audio = np.frombuffer(encoded, dtype="<i2").astype(np.float32) / 32768.0
                if len(audio) != frame.get("n_samples") or len(audio) < RATE // 10 or not np.isfinite(audio).all() or np.max(np.abs(audio)) <= 10 ** (-50 / 20):
                    raise ValueError(f"Missing, invalid or near-silent speech: {clip_id}")
                raw = results / "raw" / f"{clip_id}.wav"
                sf.write(raw, audio, RATE, subtype="PCM_16")
                tensor = trim_trailing_silence(torch.from_numpy(audio).unsqueeze(0), RATE)
                tensor = apply_mastering(tensor, sample_rate=RATE)
                tensor = normalize_audio(tensor, target_dBFS=-2.0)
                final = tensor.detach().cpu().numpy().reshape(-1)
                if not len(final) or not np.isfinite(final).all() or np.max(np.abs(final)) <= 10 ** (-50 / 20):
                    raise ValueError(f"Voice Studio processing produced invalid speech: {clip_id}")
                path = results / f"{clip_id}.wav"
                temporary = results / f".{clip_id}.tmp.wav"
                sf.write(temporary, final, RATE, subtype="PCM_16")
                temporary.replace(path)
                voiced = np.flatnonzero(np.abs(final) > 10 ** (-50 / 20))
                records.append({
                    "id": clip_id, "text": canonical, "text_sha256": text_sha256(canonical),
                    "spoken_text": spoken, "spoken_text_sha256": text_sha256(spoken),
                    "language_id": language, "mode": "inference_instruct2", "seed": config["seed"],
                    "reference_transcript_used_by_model": False,
                    "sample_rate": RATE, "channels": 1, "frames": len(final),
                    "seconds": len(final) / RATE, "sha256": sha256(path), "raw_sha256": sha256(raw),
                    "speech_start_seconds": int(voiced[0]) / RATE,
                    "speech_end_seconds": (int(voiced[-1]) + 1) / RATE,
                    "speech_boundary_method": "amplitude above -50 dBFS; approximate, not forced alignment",
                    "elapsed_seconds_including_first_model_load": time.monotonic() - begin,
                })
                print(f"Verified {clip_id}: {len(final) / RATE:.2f}s", flush=True)
            send(process.stdin, {"op": "ping"})
            frame = receive(process.stdout)
            child_vram_mb = frame.get("vram_mb")
            if frame.get("op") != "pong" or isinstance(child_vram_mb, bool) or not isinstance(child_vram_mb, (int, float)) or not math.isfinite(child_vram_mb) or child_vram_mb <= 0:
                raise RuntimeError("The model process did not confirm resident CUDA allocations.")
            print(f"Voice Studio model CUDA allocation: {child_vram_mb:.1f} MiB", flush=True)
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
    if [clip["id"] for clip in records] != meta["clip_ids"]:
        raise RuntimeError("The renderer did not produce every approved clip.")
    record = {
        "status": "complete", "schema_version": 1, "purpose": "production",
        "approved": True, "production_approved": True,
        "engine": "cosyvoice3", "job_id": job_id, "batch_id": args.batch_id,
        "created_at": datetime.now(timezone.utc).isoformat(), "device": device,
        "model": ready, "voice_settings": config, "voice_settings_sha256": sha256(config_path),
        "reference_sha256": meta["reference_sha256"], "input_sha256": meta["input_sha256"],
        "voice_id": meta.get("voice_id"), "app_helper_sha256": helper_hashes,
        "sidecar_vram_mb": child_vram_mb, "sample_rate": RATE,
        "native_sampling": "Voice Studio CosyVoice 3 defaults", "generic_mastering_applied": True,
        "effect_preset": "none", "clip_count": len(records),
        "total_audio_seconds": sum(clip["seconds"] for clip in records),
        "total_elapsed_seconds": time.monotonic() - started, "clips": records,
    }
    temporary = results / ".complete.json.tmp"
    temporary.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(results / "complete.json")
    print(f"Completed and verified {len(records)} approved CosyVoice 3 narration clips.", flush=True)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        raise SystemExit(f"Narration validation failed: {error}")

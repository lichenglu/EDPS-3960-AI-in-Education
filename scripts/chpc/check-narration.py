#!/usr/bin/env python3
"""Independently read back a completed narration batch on allocated CHPC CPUs.

ASR differences request listening review; they never approve pronunciation,
change audio, or fail the job. Invalid inputs, runtime, or model do fail it.
The private clone reference and its transcript are never opened.
"""

import argparse
from datetime import datetime, timezone
import fcntl
import hashlib
from importlib import metadata
import inspect
import json
import os
from pathlib import Path
import re
import sys
import time
import unicodedata
import wave


MODEL_ID = "Systran/faster-whisper-small.en"
MODEL_FILES = ("config.json", "model.bin", "tokenizer.json", "vocabulary.txt")
SAFE_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}\Z")
REVISION = re.compile(r"[a-f0-9]{40}\Z")
DIGEST = re.compile(r"[a-f0-9]{64}\Z")
ASR_OPTIONS = {
    "language": "en", "task": "transcribe", "beam_size": 5,
    "temperature": 0.0, "vad_filter": False,
    "condition_on_previous_text": False, "initial_prompt": "Sam, Mara",
    "word_timestamps": False,
}


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path, value):
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def load_inputs(root, batch_id, generation_job_id):
    if not root.is_absolute() or not SAFE_ID.fullmatch(batch_id) or not re.fullmatch(r"[0-9]+", generation_job_id):
        raise ValueError("Use an absolute root, safe batch ID, and numeric generation job ID.")
    results = root / "batches" / batch_id / f"results-{generation_job_id}"
    complete_path = results / "complete.json"
    complete = json.loads(complete_path.read_text(encoding="utf-8"))
    if not isinstance(complete, dict) or complete.get("status") != "complete":
        raise ValueError("The generation job has no valid completion record.")
    if complete.get("batch_id") != batch_id or str(complete.get("job_id")) != generation_job_id:
        raise ValueError("Completion record belongs to a different batch or generation job.")
    clips = complete.get("clips")
    if not isinstance(clips, list) or not clips or complete.get("clip_count") != len(clips):
        raise ValueError("Completion record must list every generated clip.")
    seen = set()
    for clip in clips:
        if not isinstance(clip, dict):
            raise ValueError("Every completed clip must be an object.")
        clip_id, text = clip.get("id"), clip.get("text")
        if not isinstance(clip_id, str) or not SAFE_ID.fullmatch(clip_id) or clip_id.casefold() in seen:
            raise ValueError("Clip IDs must be safe and unique, including case.")
        seen.add(clip_id.casefold())
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"Missing canonical text: {clip_id}")
        if hashlib.sha256(text.encode("utf-8")).hexdigest() != clip.get("text_sha256"):
            raise ValueError(f"Canonical text hash mismatch: {clip_id}")
        path = results / f"{clip_id}.wav"
        if not path.is_file() or path.resolve().parent != results.resolve():
            raise ValueError(f"Missing or invalid clip path: {clip_id}")
        expected_hash = clip.get("sha256")
        if not isinstance(expected_hash, str) or not DIGEST.fullmatch(expected_hash) or sha256(path) != expected_hash:
            raise ValueError(f"Audio hash mismatch: {clip_id}")
        with wave.open(str(path), "rb") as audio:
            frames, channels, width = audio.getnframes(), audio.getnchannels(), audio.getsampwidth()
            if frames <= 0 or audio.getframerate() <= 0 or channels <= 0 or width <= 0:
                raise ValueError(f"Empty or invalid WAV: {clip_id}")
            if len(audio.readframes(frames)) != frames * channels * width:
                raise ValueError(f"Truncated WAV: {clip_id}")
    return results, complete_path, clips


def prepare_model(root):
    """Resolve once, persist the immutable pin, and resume only that revision."""
    from huggingface_hub import HfApi, snapshot_download

    directory = root / "narration-qa"
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    model = directory / "model"
    pin = directory / "model-revision.txt"
    provenance_path = directory / "model-provenance.json"
    # Two QA jobs can share the model without racing first setup/download.
    with (directory / ".setup.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if pin.exists():
            revision = pin.read_text(encoding="utf-8").strip()
            pin_source = "existing-pin"
        else:
            if model.exists() or provenance_path.exists():
                raise ValueError("ASR model exists without a revision pin; inspect narration-qa before retrying.")
            revision = HfApi().model_info(MODEL_ID).sha
            if not isinstance(revision, str) or not REVISION.fullmatch(revision):
                raise ValueError("Hugging Face did not return an immutable 40-character ASR revision.")
            # Keep the pin even if this job is interrupted while downloading.
            with pin.open("x", encoding="utf-8") as stream:
                stream.write(revision + "\n")
            pin_source = "hub-resolved"
        if not REVISION.fullmatch(revision):
            raise ValueError("Invalid ASR revision pin; do not replace it with a floating branch.")
        if provenance_path.exists():
            provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
            if provenance.get("model_id") != MODEL_ID or provenance.get("model_revision") != revision:
                raise ValueError("ASR model provenance conflicts with the preserved pin.")
            if set(provenance.get("model_files", {})) != set(MODEL_FILES):
                raise ValueError("ASR model provenance is incomplete.")
            for name, digest in provenance["model_files"].items():
                if not (model / name).is_file() or sha256(model / name) != digest:
                    raise ValueError(f"Pinned ASR model changed or is missing: {name}")
        else:
            print(f"Preparing pinned ASR model: {MODEL_ID}@{revision}", flush=True)
            snapshot_download(MODEL_ID, revision=revision, local_dir=model, allow_patterns=list(MODEL_FILES))
            if any(not (model / name).is_file() or (model / name).stat().st_size <= 0 for name in MODEL_FILES):
                raise ValueError("The pinned ASR download is incomplete.")
            provenance = {
                "model_id": MODEL_ID, "model_revision": revision,
                "pin_source": pin_source, "created_at": datetime.now(timezone.utc).isoformat(),
                "source_url": f"https://huggingface.co/{MODEL_ID}/tree/{revision}",
                "model_files": {name: sha256(model / name) for name in MODEL_FILES},
            }
            write_json(provenance_path, provenance)
    return model, provenance


def normalized_words(text):
    """Ignore typography; expand common contractions before word comparison."""
    text = unicodedata.normalize("NFKC", text).casefold().replace("\u2019", "'").replace("\u2018", "'")
    words = re.findall(r"[a-z0-9]+(?:'[a-z0-9]+)*", text)
    special = {"can't": ["can", "not"], "cannot": ["can", "not"],
               "won't": ["will", "not"], "let's": ["let", "us"]}
    is_contractions = {"he's", "she's", "it's", "that's", "there's", "here's", "what's", "who's", "where's", "how's"}
    suffixes = {"'m": "am", "'re": "are", "'ve": "have", "'ll": "will", "'d": "would"}
    result = []
    for word in words:
        if word in special:
            result.extend(special[word])
        elif word.endswith("n't"):
            result.extend([word[:-3], "not"])
        elif word in is_contractions:
            result.extend([word[:-2], "is"])
        else:
            suffix = next((value for value in suffixes if word.endswith(value)), None)
            if suffix:
                result.extend([word[:-len(suffix)], suffixes[suffix]])
            else:
                result.append(word.replace("'", ""))
    return result


def compare_words(expected, recognized):
    reference, hypothesis = normalized_words(expected), normalized_words(recognized)
    if not reference:
        raise ValueError("Canonical text has no comparable English words.")
    # Minimum word edit distance, with a deterministic alignment for review.
    distances = [[0] * (len(hypothesis) + 1) for _ in range(len(reference) + 1)]
    for index in range(len(reference) + 1):
        distances[index][0] = index
    for index in range(len(hypothesis) + 1):
        distances[0][index] = index
    for row in range(1, len(reference) + 1):
        for column in range(1, len(hypothesis) + 1):
            distances[row][column] = min(
                distances[row - 1][column - 1] + (reference[row - 1] != hypothesis[column - 1]),
                distances[row - 1][column] + 1, distances[row][column - 1] + 1,
            )
    row, column = len(reference), len(hypothesis)
    edits = []
    while row or column:
        if row and column and reference[row - 1] == hypothesis[column - 1] and distances[row][column] == distances[row - 1][column - 1]:
            row, column = row - 1, column - 1
        elif row and column and distances[row][column] == distances[row - 1][column - 1] + 1:
            edits.append({"type": "substitution", "expected_index": row - 1, "recognized_index": column - 1,
                          "expected": reference[row - 1], "recognized": hypothesis[column - 1]})
            row, column = row - 1, column - 1
        elif row and distances[row][column] == distances[row - 1][column] + 1:
            edits.append({"type": "deletion", "expected_index": row - 1, "expected": reference[row - 1]})
            row -= 1
        else:
            edits.append({"type": "insertion", "recognized_index": column - 1, "recognized": hypothesis[column - 1]})
            column -= 1
    edits.reverse()
    counts = {name: sum(edit["type"] == name for edit in edits) for name in ("substitution", "deletion", "insertion")}
    wer = len(edits) / len(reference)
    flags = []
    if not hypothesis:
        flags.append("no_words_recognized")
    if counts["deletion"]:
        flags.append("possible_missing_words")
    if wer >= 0.30 or len(edits) >= 3:
        flags.append("large_lexical_mismatch")
    if edits:
        flags.append("lexical_mismatch")
    return {
        "normalized_expected_words": reference, "normalized_recognized_words": hypothesis,
        "reference_word_count": len(reference), "recognized_word_count": len(hypothesis),
        "word_error_rate": wer, "word_edit_distance": len(edits), **counts,
        "edits": edits, "flags": flags,
        "review_status": "listen_and_review" if flags else "no_lexical_mismatch",
    }


def run(args):
    root = args.root
    results, complete_path, clips = load_inputs(root, args.batch_id, args.generation_job_id)
    complete_sha256 = sha256(complete_path)
    qa_job_id = os.environ.get("SLURM_JOB_ID", "")
    if not qa_job_id.isdigit():
        raise ValueError("Run this check in a Slurm CPU allocation, not on a login node.")
    if Path(sys.prefix).resolve() != (root / "runtime/.venv").resolve():
        raise ValueError("Use the existing ROOT/runtime/.venv/bin/python interpreter.")
    threads = int(os.environ.get("SLURM_CPUS_PER_TASK", "4"))
    if threads < 1:
        raise ValueError("The allocation must provide CPU threads.")
    started = time.monotonic()
    model_path, model_provenance = prepare_model(root)
    from faster_whisper import WhisperModel

    model = WhisperModel(str(model_path), device="cpu", compute_type="int8", cpu_threads=threads,
                         num_workers=1, local_files_only=True)
    records = []
    for index, clip in enumerate(clips, 1):
        clip_id = clip["id"]
        begin = time.monotonic()
        segments, info = model.transcribe(str(results / f"{clip_id}.wav"), **ASR_OPTIONS)
        segments = list(segments)  # Transcription is lazy; consume it before claiming success.
        hypothesis = " ".join(segment.text.strip() for segment in segments).strip()
        comparison = compare_words(clip["text"], hypothesis)
        records.append({
            "id": clip_id, "text": clip["text"], "text_sha256": clip["text_sha256"],
            "sha256": clip["sha256"], "hypothesis": hypothesis, **comparison,
            "duration_seconds": info.duration, "language": info.language,
            "segments": [{"start": item.start, "end": item.end, "text": item.text,
                          "avg_logprob": item.avg_logprob, "no_speech_prob": item.no_speech_prob} for item in segments],
            "elapsed_seconds": time.monotonic() - begin,
        })
        print(f"ASR {index}/{len(clips)} {clip_id}: WER={comparison['word_error_rate']:.3f}; "
              f"{', '.join(comparison['flags']) or 'no lexical mismatch'}", flush=True)
    # Detect external edits during the independent readback, without modifying masters.
    for clip in clips:
        if sha256(results / f"{clip['id']}.wav") != clip["sha256"]:
            raise ValueError(f"Audio changed during ASR: {clip['id']}")
    if sha256(complete_path) != complete_sha256:
        raise ValueError("Completion metadata changed during ASR.")
    missing_or_large = [item["id"] for item in records if any(flag in item["flags"] for flag in
                        ("no_words_recognized", "possible_missing_words", "large_lexical_mismatch"))]
    flagged = [item["id"] for item in records if item["flags"]]
    total_words = sum(item["reference_word_count"] for item in records)
    report = {
        "schema_version": 1, "status": "complete", "diagnostic_only": True,
        "pronunciation_approved": False,
        "review_note": "ASR can misrecognize valid speech. Listen to every flagged clip; no lexical mismatch does not approve pronunciation, accent, voice similarity, or natural delivery.",
        "batch_id": args.batch_id, "generation_job_id": args.generation_job_id, "qa_job_id": qa_job_id,
        "created_at": datetime.now(timezone.utc).isoformat(), "complete_json_sha256": complete_sha256,
        "model": model_provenance, "device": "cpu", "compute_type": "int8", "cpu_threads": threads,
        "transcribe_options": ASR_OPTIONS,
        "normalization": "v1: NFKC, casefold, apostrophe typography, punctuation splitting, common contraction expansion; possessive apostrophes removed",
        "flag_policy": "Any word deletion is a possible omission; WER >= 0.30 or >= 3 word edits is a large mismatch. All mismatches request listening review and do not fail the job.",
        "script_sha256": sha256(Path(__file__)),
        "asr_source_sha256": sha256(Path(inspect.getsourcefile(WhisperModel))),
        "packages": {name: metadata.version(name) for name in ("faster-whisper", "ctranslate2", "huggingface-hub", "av", "tokenizers")},
        "clip_count": len(records), "flagged_clip_ids": flagged, "missing_or_large_issue_clip_ids": missing_or_large,
        "reference_word_count": total_words,
        "word_error_rate": sum(item["word_edit_distance"] for item in records) / total_words,
        "total_elapsed_seconds": time.monotonic() - started, "clips": records,
    }
    write_json(results / "asr-review.json", report)
    print(f"ASR complete: {len(records)} clips; {len(flagged)} need lexical review; "
          f"{len(missing_or_large)} have possible omissions or larger mismatches.", flush=True)
    print("Report: asr-review.json. Listening review is still required; audio was not changed.", flush=True)


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path)
    parser.add_argument("batch_id")
    parser.add_argument("generation_job_id")
    args = parser.parse_args()
    try:
        run(args)
    except Exception as error:
        # Model/API/decoder errors must fail rather than masquerade as a clean readback.
        print(f"Narration ASR check failed ({type(error).__name__}): {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

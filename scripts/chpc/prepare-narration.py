#!/usr/bin/env python3
"""Prepare a private voice-cloning batch for Voice Studio's OmniVoice CLI.

This helper copies an existing WAV reference and its exact transcript; it never
loads a model, changes Voice Studio's database, or generates speech locally.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sqlite3
import sys
from datetime import datetime, timezone


DEFAULT_DATABASE = (
    Path.home() / "Library/Application Support/OmniVoice/omnivoice.db"
)
SAFE_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}\Z")
SAMPLE_TEXT = (
    "This is a narration setup test. Listen for a clear, natural voice and "
    "compare it with the original reference recording."
)


def voice_rows(database):
    """Read without creating SQLite sidecars or ignoring a live WAL."""
    database = database.expanduser().resolve(strict=True)
    if any(Path(str(database) + suffix).exists() for suffix in ("-wal", "-journal")):
        raise ValueError(
            "Voice Studio has an active database journal. Close Voice Studio "
            "and retry so the saved reference is read consistently."
        )
    before = database.stat()
    # immutable prevents SQLite from creating locks/SHM in app-owned storage.
    # The journal guard above is essential: immutable otherwise ignores WAL.
    with sqlite3.connect(database.as_uri() + "?mode=ro&immutable=1", uri=True) as db:
        db.row_factory = sqlite3.Row
        rows = [
            dict(row)
            for row in db.execute(
                "SELECT id, name, ref_audio_path, ref_text, kind "
                "FROM voice_profiles ORDER BY name, id"
            )
        ]
    after = database.stat()
    if (before.st_mtime_ns, before.st_size) != (after.st_mtime_ns, after.st_size):
        raise ValueError("Voice Studio's database changed during the read; retry.")
    if any(Path(str(database) + suffix).exists() for suffix in ("-wal", "-journal")):
        raise ValueError("Voice Studio's database changed during the read; retry.")
    return database, rows


def reference_path(database, value):
    if not value:
        raise ValueError("The saved voice has no reference recording.")
    path = Path(value).expanduser()
    return path if path.is_absolute() else database.parent / "voices" / path


def load_reference(args):
    if args.voice_id:
        database, rows = voice_rows(args.database)
        row = next((row for row in rows if row["id"] == args.voice_id), None)
        if row is None:
            raise ValueError("Unknown voice ID. Run list-voices to see saved clones.")
        if row["kind"] != "clone":
            raise ValueError("Choose a saved clone with a WAV reference.")
        audio_path = reference_path(database, row["ref_audio_path"])
        transcript = row["ref_text"]
        voice_id, voice_name = row["id"], row["name"]
    else:
        if args.reference_text is None:
            raise ValueError("--reference-audio requires --reference-text PATH.")
        audio_path = args.reference_audio.expanduser()
        transcript = args.reference_text.expanduser().read_text(encoding="utf-8")
        voice_id, voice_name = "supplied-reference", "Supplied reference"
    if not isinstance(transcript, str) or not transcript.strip():
        raise ValueError("A nonempty, exact reference transcript is required.")
    audio = audio_path.read_bytes()
    if len(audio) <= 44 or audio[:4] not in (b"RIFF", b"RF64") or audio[8:12] != b"WAVE":
        raise ValueError("The reference must be a nonempty WAV recording.")
    return voice_id, voice_name, audio, transcript


def load_clips(args):
    if args.sample:
        if args.approved:
            raise ValueError("A setup sample uses --sample without --approved.")
        return [{"id": "setup-sample", "text": SAMPLE_TEXT, "language_id": "en"}]
    if not args.approved:
        raise ValueError(
            "Production narration requires --approved after instructor approval "
            "of the complete script batch and chosen voice."
        )
    clips, seen = [], set()
    with args.input.expanduser().open(encoding="utf-8") as source:
        for line_no, line in enumerate(source, 1):
            if not line.strip():
                continue
            try:
                clip = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON on input line {line_no}.") from exc
            if not isinstance(clip, dict):
                raise ValueError(f"Input line {line_no} must be a JSON object.")
            if set(clip) - {"id", "text", "language_id"}:
                raise ValueError(
                    f"Input line {line_no} accepts only id, text, and language_id; "
                    "pacing and clone settings are fixed for fidelity."
                )
            clip_id, text = clip.get("id"), clip.get("text")
            if not isinstance(clip_id, str) or not SAFE_ID.fullmatch(clip_id):
                raise ValueError(f"Input line {line_no} needs a safe filename ID.")
            if clip_id.casefold() in seen:
                raise ValueError(f"Input line {line_no} has a duplicate ID.")
            if not isinstance(text, str) or not text.strip():
                raise ValueError(f"Input line {line_no} needs nonempty text.")
            language = clip.get("language_id", "en")
            if not isinstance(language, str) or not language.strip():
                raise ValueError(f"Input line {line_no} needs a language_id string.")
            seen.add(clip_id.casefold())
            clips.append({"id": clip_id, "text": text, "language_id": language})
    if not clips:
        raise ValueError("The input contains no narration clips.")
    return clips


def prepare(args):
    if args.voice_id and args.reference_text:
        raise ValueError("--reference-text is used only with --reference-audio.")
    voice_id, voice_name, audio, transcript = load_reference(args)
    clips = load_clips(args)
    rows = [
        {**clip, "ref_audio": "reference.wav", "ref_text": transcript, "speed": 1.0}
        for clip in clips
    ]
    manifest = "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows).encode("utf-8")
    metadata = {
        "version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "purpose": "smoke-test" if args.sample else "production",
        "approved": not args.sample,
        "voice_id": voice_id,
        "voice_name": voice_name,
        "reference_sha256": hashlib.sha256(audio).hexdigest(),
        "input_sha256": hashlib.sha256(manifest).hexdigest(),
        "clip_ids": [clip["id"] for clip in clips],
        "clip_count": len(clips),
    }
    output = args.output.expanduser().absolute()
    output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    output.mkdir(mode=0o700)  # Never overwrite an existing batch.
    try:
        (output / "reference.wav").write_bytes(audio)
        (output / "narration.jsonl").write_bytes(manifest)
        (output / "metadata.json").write_text(
            json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    except Exception:
        shutil.rmtree(output)
        raise
    print(f"Prepared {len(clips)} clip(s): {output}")
    print(f"Purpose: {metadata['purpose']}; reference transcript kept inside the private package.")


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    listing = commands.add_parser("list-voices", help="List saved clones without transcripts.")
    listing.add_argument("--database", type=Path, default=DEFAULT_DATABASE)
    batch = commands.add_parser("prepare", help="Copy an approved batch or neutral setup sample.")
    reference = batch.add_mutually_exclusive_group(required=True)
    reference.add_argument("--voice-id", help="Saved Voice Studio clone ID.")
    reference.add_argument("--reference-audio", type=Path, help="Supplied clone reference WAV.")
    batch.add_argument("--reference-text", type=Path, help="UTF-8 file with its exact transcript.")
    batch.add_argument("--database", type=Path, default=DEFAULT_DATABASE)
    contents = batch.add_mutually_exclusive_group(required=True)
    contents.add_argument("--input", type=Path, help="JSONL with id, text, optional language_id.")
    contents.add_argument("--sample", action="store_true", help="Prepare only a neutral setup test.")
    batch.add_argument("--approved", action="store_true", help="Record instructor approval of production scripts and voice.")
    batch.add_argument("--output", type=Path, required=True, help="New private package directory; must not exist.")
    args = parser.parse_args()
    try:
        if args.command == "list-voices":
            _, rows = voice_rows(args.database)
            for row in rows:
                print(json.dumps({"id": row["id"], "name": row["name"], "kind": row["kind"]}, ensure_ascii=False))
        else:
            prepare(args)
    except (OSError, ValueError, sqlite3.Error) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

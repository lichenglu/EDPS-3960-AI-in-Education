# Voice Studio narration on CHPC

Run the laptop commands from the project root with Python 3.12 or later. Install Voice Studio locally before deploying its runtime. Week 2 video rendering also uses Bun, Playwright Chromium and FFmpeg.

## Connect to Granite

If this is your first Granite connection, verify and add the host key using CHPC’s SSH instructions before running the helper. [CHPC access instructions](https://chpc.utah.edu/resources/access.php)

```sh
python3 scripts/chpc/narration.py login
python3 scripts/chpc/narration.py inspect
```

On macOS, you can also open `scripts/chpc/login.command` in Terminal. At the first login, enter your own university UID. The helper accepts a `u` followed by seven digits or the seven digits alone. It writes the UID to `data/narration-chpc/uid`, which is ignored by Git. Complete the password and MFA prompts directly in SSH. Run `login` again when the connection expires.

To use a different account for one session, supply the global `--uid UID` option before the subcommand or set the `CHPC_UID` environment variable. The helper derives the Granite hostname and your scratch directory from the selected account. To change the saved account, replace the ignored UID file and log in again.

`inspect` prints the allocations available to your account. Set the CPU and GPU account, partition and QoS variables below from `mychpc batch` on Granite. Omit the `--qos` argument if your allocation has no required QoS.

## Deploy and install

```sh
python3 scripts/chpc/narration.py deploy
python3 scripts/chpc/narration.py setup \
  --account "$CHPC_CPU_ACCOUNT" --partition "$CHPC_CPU_PARTITION" --qos "$CHPC_CPU_QOS"
python3 scripts/chpc/narration.py status JOB_ID
python3 scripts/chpc/narration.py logs JOB_ID
```

Deployment uses the source in the installed Voice Studio application. Use `deploy --resources PATH` if the app resources are elsewhere. The installer reuses the OmniVoice model revision recorded by the installed app. If the marker is absent, pass the installed revision with `deploy --model-revision SHA`. Setup runs in a Slurm allocation and pins the shared runtime and native CosyVoice 3 model. Run setup and rendering on compute nodes. Retrieve reviewed results from scratch.

The shared [narration defaults](../scripts/chpc/narration-defaults.json) select native CosyVoice 3 and a conversational delivery. For a private configuration, copy that file to `data/narration-chpc/narration-defaults.json` before deployment. An approved voice can be pinned there by its `reference_sha256`. The worker always checks the reference WAV against its batch metadata. Keep reference recordings and their exact transcripts with the private batch. The default production job requests one 18 GB H200 MIG slice, 32 GB of host memory, four CPUs and 30 minutes. Adjust the request only when your available hardware or the workload requires it.

## Prepare and record a batch

Start with a short sample and review its pronunciation, pacing and voice with the instructor. Use `prepare-narration.py list-voices` to find a clone from your own Voice Studio installation, or provide a reference WAV and its exact text. Use `--sample` in place of `--input` for a setup sample and omit `--approved` until script and voice approval.

For Week 2, export the 20 authored lines. For another lesson, use a JSONL file with a stable `id`, exact `text`, and optional `language_id` per clip.

```sh
bun scripts/export-week-two-narration.ts
python3 scripts/chpc/prepare-narration.py prepare \
  --reference-audio "$APPROVED_REFERENCE_WAV" --reference-text "$APPROVED_REFERENCE_TEXT" \
  --input data/narration-chpc/week-two-script/narration.jsonl --approved \
  --output data/narration-chpc/batches/week-two-approved
python3 scripts/chpc/narration.py upload week-two-approved
python3 scripts/chpc/narration.py submit week-two-approved \
  --account "$CHPC_GPU_ACCOUNT" --partition "$CHPC_GPU_PARTITION" --qos "$CHPC_GPU_QOS"
python3 scripts/chpc/narration.py status JOB_ID
python3 scripts/chpc/narration.py fetch week-two-approved JOB_ID
```

Use a new batch ID for each revision. Downloads go to ignored storage under `data/narration-chpc/downloads/`. Review the rendered lines and retain their matching `complete.json` in the result directory. You can run the optional CPU readback diagnostic from Granite by submitting `scripts/check-narration.sbatch` from the deployed directory with your CPU allocation and the deployed absolute root, batch ID and generation job ID as arguments. Readback helps find missing words. Listen to judge delivery.

## Rebuild and check the lesson video

```sh
bun scripts/time-week-two-voice.ts --narration-dir "$APPROVED_RESULTS"
bun scripts/build-film-art.ts
bun scripts/render-film-art.ts
bun scripts/render-film-art.ts --video
```

Point `APPROVED_RESULTS` to the fetched `results-JOB_ID` directory. The timing tool checks each recorded line against the script. It verifies audio hashes and the 24 kHz mono WAV format, then writes the voice master, the 90-second edit timings, and a WebVTT cue for each line. The renderer mixes the original score with the voice. It also produces a standalone MP4 with selectable subtitles.

The web release consists of the MP4, poster and WebVTT file in `public/activities/week-two/`. Check the timing of the picture, narration, annotations, captions, and transcript in the lesson. The published player uses the packaged video. Raw voice files, job metadata and the offline viewer are local authoring artifacts.

For temporary macOS review audio, pass `--review` to both the timing script and video renderer.

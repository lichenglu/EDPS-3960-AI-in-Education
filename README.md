# AI in Education

A browser course game for ED PS 3960-090. Choose a course week on the [landing page](http://127.0.0.1:4173/). [Week 1](http://127.0.0.1:4173/quests/w01) uses the same link in Canvas and in its own tab.

## Run locally

With Bun 1.3.9 or later and Node.js 20.19+ (20.x) or 22.12+, run `bun install --frozen-lockfile` and `bun run dev` from this directory. Vite serves the React app on port 4173 and applies compatible component edits with Fast Refresh. Bun runs the API on a separate local port and restarts it after server edits. Use the Vite **Local** URL in the terminal. Set `GAME_PORT=46817` to run alongside another preview, or set `GAME_DB` to use a separate database. The default database is `data/course.sqlite`.

For a static preview, run `bun run build` and `bun run start`. Week 1 and Week 2 open locally without a code and save practice progress in the current browser. Visit `/instructor` and select **Use demo instructor** to see the roster.

## Visual style

The game uses Animal Island UI’s ribbon headings and pill buttons, with an original illustrated workshop rendered in React Three Fiber. The six station stills come from the same room. [Visual guide](DESIGN.md) · [Animal Island UI](https://github.com/guokaigdg/animal-island-ui)

### Create or update 3D assets

Open the current Week 1 studio at `/quests/w01` and use a comparable room detail, prop, or character as your reference. [3D asset standards](DESIGN.md#3d-asset-standards) · [Week 1 Blender scene](art/classroom-studio/classroom.blend)

Run `blender --version` before starting. If you installed Blender in macOS Applications, you can also run `/Applications/Blender.app/Contents/MacOS/Blender --version`. If Blender is missing, install it for your operating system and verify it with the version command. [Official Blender download](https://www.blender.org/download/)

From the project root, regenerate the Week 1 Blender scene and browser GLB with `blender -b -t 4 --python art/classroom-studio/classroom.py`. Use the full executable path if needed. For other 3D assets, include the editable Blender source and the exported GLB in the change. Attach an in-game screenshot next to the Week 1 reference for review.

## Where changes belong

The browser follows Bulletproof React’s feature organization, directed imports and feature-owned requests. The course uses one Bun server and one deployment. [Project structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) · [API layer](https://github.com/alan2207/bulletproof-react/blob/master/docs/api-layer.md)

| Location | Owns |
| --- | --- |
| `src/app` | Browser entry, routes, and composition of identity, instructor and quest features |
| `src/features/identity`, `instructor`, `quests` | Feature components and typed API operations. Quest activities, room models, and station-specific styles live alongside their player. |
| `src/components`, `src/lib` | Reused controls and the shared HTTP client |
| `src/curriculum` | Syllabus catalog, authored scene scripts, prompts, and public evidence |
| `src/game`, `src/contracts` | Deterministic completion rules and shared request and response types |
| `src/server` | Session and course authorization, local SQLite or hosted Supabase Postgres, checkpoint transitions, peer exchange, gated feedback and the AI lab |
| `public/activities` | Archived Week 1 handout and shared activity assets |
| `tests`, `tests/browser` | Content, rule, architecture, API and browser checks |

Quest pages start with the shared `QuestMasthead`. The course link, week ribbon, spacing, and language control come from that component. Each quest supplies its title, navigation, and tools as needed. Course sign-in uses `QuestAccess` for its layout and `AccessGate` for the form and learner session. The instructor issues one code per learner for the course.

Every entry to Week 2 opens on **I Do**. In *Water under the door*, a 90-second video, the instructor models how a teacher decides what to say after a reader answers and explains why that decision interested designers of computer tutors. Returning learners can resume their next saved activity directly from I Do. The native video player plays a single soundtrack with narration and an original score. Five on-screen annotations point to evidence in the story and tutor responses. English captions and a compact, scrollable transcript follow the same edit. The spoken line is highlighted and stays in view during playback and seeking. The We Do stage introduces the archive and all eight interactive years. The stage estimates are 2, 76, and 20 minutes. Local Instructor Mode opens the stages for rehearsal and keeps its answers in memory. Reset progress restarts the Week 2 work saved in this browser; Reset preview clears only the demonstration. Enrolled learners use their own saved checkpoints.

Use [LessonVideo](src/components/LessonVideo.tsx) for future generated course videos. Supply the video, poster, WebVTT captions, and authored transcript sections. Caption cues must match the spoken lines in order, one cue per line, so repeated sentences remain distinct. The component supplies native controls, closed captions, a collapsed transcript with synchronized highlighting and scrolling, and full text/print alternatives. Keep sources and lesson headings in the surrounding lesson component. [WeekTwoIntro](src/components/WeekTwoIntro.tsx) shows the shared player in a lesson layout. When narration or editing changes, regenerate the captions from the final audio and verify forward and backward seeking in the running player.

The editable script is in `src/curriculum/week-02/intro-films.ts`. The 90-second film uses instructor-approved CosyVoice 3 narration with an original score and 20 synchronized English captions. Algorithmic artwork follows the instructor’s film direction independently of the course interface. The art and timing files are in `art/week-two-film`. The packaged video, poster and captions are available to play immediately. Request approved line recordings from the course team when rebuilding final narration. [Recording setup](docs/chpc-narration.md)

After retrieving and reviewing a completed batch, place its `complete.json` and line WAVs in `art/week-two-film/audio/cosyvoice3/`, then rebuild from `the-next-move/`:

```sh
bun scripts/time-week-two-voice.ts
bun scripts/build-film-art.ts
bun scripts/render-film-art.ts
bun scripts/render-film-art.ts --video
```

The timing command defaults to approved CosyVoice recordings, verifies each clip against the current script, and writes the natural-speed master, visual timings, and one English caption cue per spoken line. It preserves every line and the 90-second cut, failing clearly if the speech and reading holds cannot fit. Use `--narration-dir PATH` for another approved recording folder. The viewer build refreshes the editable offline artwork; the render without `--video` checks seeds and controls and exports review stills. The video render also rebuilds the viewer so visual cues use the current timings, then publishes the MP4 and poster to `public/activities/week-two`. Temporary Samantha speech on macOS requires explicit `--review` on both timing and video rendering; the normal render does not fall back to it.

A browser feature can import its own modules and shared code. Routes compose features. A test checks those boundaries and prevents browser imports of server-only answers. UI drafts and open panels stay local. Confirmed progress comes from the server. Both the 3D and text views use the same actions and checkpoint. [State management](https://github.com/alan2207/bulletproof-react/blob/master/docs/state-management.md) · [Testing](https://github.com/alan2207/bulletproof-react/blob/master/docs/testing.md)

To add a quest, keep its syllabus ID, define its versioned content, and add tests for its completion rules and independent task. Put protected feedback and replay results in the server. The archived Week 1 uses the v1 action contract. Week 5 uses the snapshot format. [HTTP contract](docs/openapi.yaml) · [Course implementation requirements](AGENTS.md)

Course weeks have a printable handout at `/quests/wNN/print`. Open it without a learner code, then select **Print or save as PDF**. Weeks 1, 2 and 5 have activity handouts. Weeks in development show their syllabus summary until the activity is ready.

## Edit course content

| To change | Edit |
| --- | --- |
| Week order, titles, or syllabus dates | [Course manifest](src/curriculum/course-manifest.ts) |
| Character display names, roles, and species | [Course cast](src/curriculum/characters.json) |
| Week 1 mission or opening order | [Week 1 manifest](src/curriculum/week-01/manifest.ts) |
| Week 1 dialogue, station greetings, activities, or questions | [Week 1 content](src/curriculum/week-01) |
| Week 1 concept links, readings, videos, or excerpt times | [Week 1 references](src/curriculum/week-01/references.ts) |
| Week 5 activities or references | [Week 5 content](src/curriculum/week-05) |

Keep the IDs when editing copy or links. Week 1 checkpoints store mission IDs, so reordering desks preserves earned progress. Week 5 checkpoints store a step position. Increment its content version before changing a released step order and keep the prior version available for existing records. Run `bun run check` after edits.

## Formatting and languages

Run `bun run format` to format source, scripts, and tests, or `bun run format:check` to validate them. The formatter also runs as part of `bun run check`.

Use **Language** on the course and studio pages to switch between English and Spanish. Spanish covers the course navigation, sign-in, instructor dashboard, and Week 1 studio controls. Authored dialogue, lesson material, and printable handouts use the approved English content. Shared interface strings live in [the translation catalogs](src/lib/i18n). Spanish course topics and Week 1 mission summaries live alongside their curriculum data. Use `?lang=es` on a Canvas or standalone link to open the Spanish interface directly.

## Check a change

Run `bun run check` for strict TypeScript, rules, HTTP integration tests and the production build. Run `bunx playwright install chromium firefox webkit` once, then `bun run test:e2e` for the browser journeys. The tests start a separate server with an in-memory database, create synthetic learners, and exercise the real UI. Each run uses temporary Firefox data and prints the folder containing its browser results and screenshots.

## Week 1 and Canvas

The **Week 1 AI literacy studio** opens at `/quests/w01`. The five desks teach the AI4K12 ideas through captioned introductions, guided cases, and optional checks. A connected learner’s checkpoints and completed missions appear in the instructor roster. The local guest preview saves to the current browser. The orientation check is submitted in Canvas.

The instructor dashboard at `/instructor` issues private learner access codes and opens a separate **Preview Week 1** mode. Students can use the same code in Canvas and in a standalone tab. Set `GAME_CANVAS_ORIGINS` to the verified Canvas origins when hosting the HTTPS app. Test the embed in Canvas Student View before release. This checkout uses synthetic accounts. University instructor sign-in, real roster provisioning, approved audio and learner timing checks remain release work. The public demo always uses fixed AI lab responses. The optional server adapter caps spending at $400 across the semester, leaving $100 of the $500 ceiling for billing differences.

The Week 1 player is in `src/features/quests/week-one/studio`. Its editable content is in `src/curriculum/week-01`. Internal source copies, narration drafts, and syllabus working files are kept with the course preparation materials outside the game project.

### Hosted storage and analytics

`bun run dev` and the test suites use synthetic records and leave both hosted integrations off. Set `GAME_STUDIO_ACCOUNTS=1` to preview the account-backed Week 1 and Week 2 flows locally. Use the following server environment settings for an approved HTTPS deployment.

| Setting | Purpose |
| --- | --- |
| `GAME_RUNTIME=production`, `GAME_STORAGE=supabase` | Enables the hosted deployment and requires authenticated play in Weeks 1 and 2. |
| `SUPABASE_DATABASE_URL` | Server-only Postgres URL for a direct connection or Supabase session pooler. The server verifies TLS and initializes the private `course_game` schema. Use a dedicated database role with the required schema permissions. If the database supplies its own root certificate, set `SUPABASE_DATABASE_CA_FILE` to its PEM file on the server. |
| `GAME_COURSE_ID`, `GAME_INSTRUCTOR_LABEL`, `GAME_INSTRUCTOR_CODE` | Provisions an instructor for the course on first startup. Use a private random URL-safe code of at least 32 characters. Remove the bootstrap settings after successful provisioning. |
| `GAME_POSTHOG_ENABLED=1`, `POSTHOG_PROJECT_TOKEN`, `POSTHOG_HOST` | Opts in to server-side analytics. Set the PostHog ingestion host to `https://us.i.posthog.com` (default) or `https://eu.i.posthog.com`. |
| `GAME_CANVAS_ORIGINS` | Comma-separated HTTPS origins authorized to frame the game. |

PostHog receives anonymous Week 1 starts, mission completions, week completions, and unexpected checkpoint-save failures. The server sends no learner identifiers, work, or browser events. Supabase holds the roster and checkpoint history. Analytics delivery is best-effort and independent of saves. Validate both integrations with synthetic data before relying on them in class. [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres) · [PostHog Capture API](https://posthog.com/docs/api/capture-v1)

### Earlier Week 1 runs

Open `/archive/week-one` to resume a learner’s account-backed run of **The first evening**, or `/activities/w01.html` for its printable activity. In local development, **Start over** opens a fresh demo run and **Return to saved run** restores the original session. Set `GAME_DEMO_RUNS=0` to hide the demo option.

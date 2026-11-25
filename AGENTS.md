# ED PS 3960 AI in Education

Build an original, browser-based course game for ED PS 3960-090. Use the current syllabus for learning objectives, module topics, and assignments. Give each instructional Canvas module a stable quest link. Structure each quest as I Do, We Do, and You Do, with automatic progress saving and an instructor dashboard. Use an attempt-first guided case and a brief, optional check for understanding. Include independent transfer tasks when the syllabus calls for them.

## Roles

Codex orchestrates project work and review. Use the multi-agent workflow below for course content. Ask Claude Code or Antigravity for help only when the instructor explicitly requests it. Limit each external assignment or review to the agents and work the instructor requests.

| Agent | Leads | Review emphasis |
| --- | --- | --- |
| **Codex** | Orchestrates the project, scopes changes, writes and runs tests, implements features, and integrates reviewed work. | Acceptance criteria, integration, regression tests, and verification in the running app. |
| **Claude Opus 5.5 in Claude Code** | When requested, leads visual design and work on `the-next-move/DESIGN.md`, architecture, quest data format, progress storage, instructor access, and technical interfaces. Documents consequential tradeoffs. | Visual consistency, correctness, data handling, maintainability, and failure cases. |
| **Gemini 4 Neon in Antigravity** | When requested, drafts quest scenarios, lecture scripts, worked examples, hints, independent tasks, and student-facing instructions. | Learning objectives, source accuracy, feedback quality, clarity, and the student experience. |

Run every Claude assignment and review directly in Claude Code with `claude -p --model claude-opus-5-5 --effort high`. Run every Gemini assignment and review in a separate Antigravity CLI session with `agy -p --model gemini-4-neon-high`. Record the CLI, model, and effort level with each review. Only a response from the specified CLI and model at high effort counts as that agent's review.

Use this file as the common brief. Include its path and ask each external agent to read it at the start of each handoff. Use public sources and synthetic learner examples in external agent handoffs. The instructor owns course objectives, grading decisions, and publication. Codex keeps the working plan and final decisions in the project.

### Multi-agent workflow for course content

Use six agents when developing a new week or substantially revising a quest. Codex serves as the orchestrator and assigns each specialist a distinct deliverable.

| Role | Responsibility |
| --- | --- |
| **Orchestrator** | Sets the scope from the syllabus and instructor feedback, assigns work, resolves conflicts, and verifies the integrated quest in the running game. |
| **Learning scientist** | Defines what students should learn and what would show they learned it. Designs the I Do, We Do, and You Do sequence, including practice, hints, and feedback. |
| **Technical writer (ELI5)** | Turns the learning design into short, plain-language dialogue and instructions. Explains unfamiliar ideas with concrete classroom examples and defines essential terms where students first need them. |
| **Designer** | Follows the instructor's design direction. Uses **Week 1 and `the-next-move/DESIGN.md`** as references for later weeks. Reuses established components and interactions. Gives each element a clear purpose and consolidates duplicate controls, panels, labels, or instructions. |
| **Proofreader** | Checks lesson text, citations, quiz answers, and feedback against the original sources. Verifies titles, authors, versions, and assigned excerpts. Downloads copies authorized for course use and organizes them by week as `Week NN - Author (Year) - Short Title.ext`. Records the source link, local file path when there is a local copy, and access status. |
| **Technologist** | Implements the quest using maintainable components and editable lesson data. Reuses shared patterns where they fit and tests the student flow. |

Start with the learning objective and evidence of learning. Have the writer and designer work from that brief. The proofreader verifies and organizes the resources before the technologist integrates them. The learning scientist, designer, and proofreader review their respective parts in the running quest. The orchestrator checks the integrated result against the syllabus and instructor feedback.

## Review

1. Assign one author per change. Give the author the goal, starting version, affected files, and observable acceptance criteria. Use separate working copies for concurrent edits.
2. Codex checks each change against the acceptance criteria. When the instructor requests an external review, send the same fixed revision to each requested reviewer. If both are requested, have them review independently and in parallel. Reviewers inspect the actual deliverable and relevant evidence.
3. Each external reviewer returns `Approve` or `Changes requested`, names the revision and checks run, and points to evidence for any required fix. Label optional suggestions separately. The author resolves findings and returns material revisions to each requested reviewer. Keep review comments and related fixes together in the task record.
4. Codex integrates after the relevant checks pass and any requested external reviewers approve the same revision. Resolve disagreements against the syllabus, source material, observed behavior, or reproducible tests. Surface unresolved course and product decisions to the instructor.
5. If a requested external reviewer is unavailable, record its review as `Pending`, provide a paste-ready handoff, and continue independent work. A review counts when the requested reviewer returns its own assessment. The instructor can explicitly accept a review exception.

Use the following handoff for writing, design, implementation, and review.

```text
Assignment and author
Starting version and files in scope
Expected behavior or learning objective
Acceptance checks and supporting sources
Deliverable or revision to review
Tests run, results, and open questions
```

## I Do, We Do, and You Do

Define the learning objective and what students will do to show it before drafting a quest. Give each stage a distinct purpose and use one main hands-on case for the concept. Keep accessibility supports available throughout.

| Stage | Student experience |
| --- | --- |
| **I Do** | Explain why the problem matters, connect it to prior work or familiar practices, and show how the course uses the concept. Prefer a clear, captioned video or excerpt of **10 minutes or less**. Pair it with one guiding question and an equivalent text option. If no suitable video is available, use a short, credible article students can open without signing in. |
| **We Do** | Students work through the main interactive case and make the key decisions. Offer hints after a first attempt, explain the feedback, and allow retries. When the quest uses the User, Developer, and Critic perspectives, connect each perspective to an action students take in the case. |
| **You Do** | Offer a brief reflection or a few scenario-based questions as an optional, ungraded check. For multiple-choice questions, say **Best choice** or **A better choice is available** and explain why. Students can skip or retry. Answers and scores stay out of saved progress and instructor reports. Skipping or choosing a less effective answer has no effect on completion, unlocks, or grades. |

Plan **90–120 minutes of active game engagement per instructional week**. Show a minute estimate for each part. Keep the quick check brief and use distinct activities when the week needs more practice. Treat optional Zoom, waiting for classmates, and separate course readings and assignments as outside that estimate. Use plain language, concrete examples, and controls that require no prior coding experience. Include a longer independent transfer task when the syllabus calls for one. Show its success criteria and track independent and assisted attempts separately when that distinction matters to the objective.

## Modular course content

- Keep each new week in `src/curriculum/week-NN/`. Give it a stable quest ID, a version, and an authored sequence of stable step, scene, or mission IDs. Keep story, activities, resources, narration, and asset references in editable data. React components render the data and own interaction behavior. Share the same sequence and completion rules with the progress API.
- Change the course display order and syllabus metadata in `src/curriculum/course-manifest.ts`. Keep Canvas links and stored IDs stable when rearranging weeks or renaming content. Use `src/curriculum/characters.json` for display names, roles, species, and portrait links. Reference those entries by ID from new content and asset bindings.
- Keep each week's assigned readings, citations, web links, videos, and excerpt settings in its `references.ts`. Use that catalog wherever the resources appear. Check captions and the equivalent text when changing an excerpt. Verify replacement links before publishing.
- Preserve saved checkpoints for wording, name, link, and compatible ordering edits. When changing what a stored answer, numbered step, or completion means, give the quest a new content version and preserve readable older records. Test the manifest, references, and resume behavior before release.
- Use the course's stable Canvas iframe links. The content folders use a SCORM-inspired manifest and reusable resources.

## Reading and media access

- Verify the title, all authors, and the assigned edition or chapter. Open the actual reading in a signed-out browser before labeling it freely available. Record a publisher-announced release date and label the reading as forthcoming until full text is available.
- Prefer a public copy from the publisher, authors, or a recognized repository. Label related readings as separate works. Use a public, view-only Google Drive link only when the copy is authorized for public redistribution.
- Keep internal testing materials in the project workspace or approved private storage. The instructor handles Canvas uploads and student release. Use Canvas Course Materials or a library link for subscription readings that need course-only access.
- Verify the assigned video segment, its captions, and playback in the game. Provide a direct link and a text alternative students can use if the player fails to load.

## Narration during testing and release

Author and approve the story, branching dialogue, worked examples, and canonical feedback before release. Use browser voices as placeholders while scripts are in development. Once the instructor approves the full script batch, generate the final narration locally in **Voice Studio** using the course team's approved voices. Replace the placeholders in one batch. Keep scripts, audio, captions, transcripts, and character assets separate so each can be revised independently.

## Asynchronous collaboration

- Give students a course-only way to exchange reasoning asynchronously during practice. A Drift Bottle lets a student write a short note about a case, send it to the class pool, and reply to a classmate's note. Prompt for evidence, a useful question, or a test a classmate could run.
- Have students record their own initial thinking before reading peer notes. Use the guided case for the exchange. Provide a labeled example and the same reply task when a peer note is unavailable. A student can finish the activity while peer replies are still pending.
- Use course-scoped access, minimum display labels, instructor moderation, and clear send and retry feedback. Prompt for course cases and synthetic examples. Give students an equivalent text activity in Canvas. Preserve the syllabus submission and grading scheme.

## Optional AI features

- Use live AI in optional interactive activities such as a prompt sandbox, an extra hint after a first attempt, or a practice variation based on fictional examples. Label live output and provide a scripted equivalent. Use fixed responses in story scenes, instructional comparisons, and assessments that need reproducible evidence. Keep student identifiers, peer posts, and student work out of API requests.
- Plan for **20 students and a $500 semester ceiling for OpenAI API use**. Use a dedicated restricted project key kept on the server in an approved secret store. Track cumulative spending in the game across months and stop paid requests before the ceiling, with a margin for billing differences. The scripted path continues if live AI is unavailable or its budget is exhausted.

## Course characters and onboarding

- Build a recurring cast of course characters with distinct roles. When a character first appears, introduce them by name and explain what students can expect from them, such as modeling a worked example or guiding practice. Reinforce each role with consistent labels and behavior across quests. Use placeholder characters until the cast is designed.
- Provide brief, in-context onboarding the first time students encounter each new interaction, feature, or mini-game, before they need to use it. Explain the goal, the first action, any controls they need, and how they will know they are done. Use a short demonstration or a low-stakes practice turn for unfamiliar mechanics. Let students reopen the instructions during the activity. For independent tasks, teach students how to use the interaction while leaving the learning task for them to solve.
- Highlight interactive objects on hover and show a short introduction with **Confirm** and **Cancel** before opening a station. Make locked stations apparent in the scene. Let students dismiss and reopen the controls tutorial.

## 3D asset contributions

- Brief every collaborator who creates or revises a 3D character, prop, or room to use the current Week 1 studio at `/quests/w01` and the [3D asset standards](DESIGN.md#3d-asset-standards). Name an existing character, prop, or room detail to use as a comparison.
- Use Blender for 3D asset authoring and export. Check `blender --version` or the installed Blender app before starting. If Blender is missing, ask the contributor to install it and include the [official Blender download](https://www.blender.org/download/). See the [setup in README.md](README.md#create-or-update-3d-assets).
- Keep the editable Blender source and the generator when an asset is script-generated. Use GLB for the browser. Preserve any object names and station or character IDs used by the game.
- Review the asset in the running game before merging. Include a screenshot from the normal player view alongside the chosen Week 1 reference in the review notes. Check the style and scale, and test reachability, collisions, hover, and clicks where the asset is interactive.

## Canvas iframe and progress tracking

- Serve the game as a standalone HTTPS app. Launch it in a Canvas iframe using the instructor's existing permissions, independently of LTI or Canvas API access. Offer the same quest URL as a new-tab link and provide an equivalent text activity for graded coursework. Canvas remains the place for course submissions and grades.
- Release every instructional week with a printable, login-free handout at `/quests/wNN/print`. Link to it from the course index and quest. Reuse the week's learning objective, I Do, We Do, You Do prompts, and sources. Include paper-friendly evidence and tasks for activities that use audio or on-screen controls. Keep protected independent feedback out of the handout. Verify the layout in print preview before release. Weeks still in development show a labeled syllabus summary at the same URL.
- Create an app learner record for each enrolled student and let the instructor issue a private, high-entropy access code tied to that record. Students enter the code when connecting a browser or device. Restore their session automatically when the browser permits it and let them re-enter the code when embedded storage is blocked. Keep codes hashed on the server and out of links, logs, and shareable copies. An instructor can reissue a code without resetting progress. Use the app credential to identify learners and exclude browser and biometric fingerprints from collection. [Browser storage partitioning](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/State_Partitioning) · [Browser fingerprinting](https://developer.mozilla.org/en-US/docs/Glossary/Fingerprinting)
- Save progress to the server automatically when a learner completes a stage or reaches a meaningful checkpoint. Store the quest ID and version, stage status, the state needed to resume, and the last successful save time. Show saving, saved, and retry states. Keep a failed save visible until it succeeds and prevent an older save from overwriting a newer checkpoint.
- Give the instructor a sign-in for the game and a separate dashboard. Use University authentication and multifactor authentication where technically feasible. Show a roster view with each learner's progress by quest and stage, completion status, and last save. Enforce permissions on the server. Students can access their own progress and instructors can access the courses they teach. [University access management rule](https://regulations.utah.edu/it/rules/Rule4-004D.php)
- Use the minimum roster label needed for the dashboard. Use synthetic rosters in development and a University-approved environment for real learner records. When the instructor keeps the name-to-label mapping separately, store it in an approved university system and keep it private. Guest copies contain only the student-authored quest. [University student records policy](https://regulations.utah.edu/academics/6-411.php) · [University data classification and encryption rule](https://regulations.utah.edu/it/rules/Rule4-004C.php)
- Configure the host's `Content-Security-Policy` `frame-ancestors` to allow the verified Canvas origins used by the course. Verify the iframe from Canvas Student View with instructor access. Keep a visible direct link for contexts that restrict framing. [Frame embedding guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)

## Storage and analytics

- Use Supabase Postgres through the server for hosted learner accounts, sessions, checkpoint records, and course data. Keep database credentials in the server environment. Use the same learner account and weekly checkpoint API from Canvas and standalone links. Keep versioned history and preserve the last committed checkpoint when a save fails.
- Use PostHog for server-side, explicitly named course events. Send only approved categorical fields such as week and mission ID. Keep account identifiers, access codes, roster labels, answers, peer posts, and request bodies out of event data. Browser autocapture and session replay stay off. When building a week, connect its checkpoints to the shared database and emit allowlisted events tagged with its stable quest ID.
- Development and automated tests use local SQLite or isolated local Postgres with synthetic records. `bun run dev` disables both hosted services regardless of inherited credentials. Use Supabase for hosted progress and enable PostHog separately after University review. Document server settings in the project README and test the live services with synthetic records before release. An analytics outage never changes a learner’s saved progress.
- Give learners the standard studio. Launch instructor previews from the authenticated dashboard with labeled demo state that never writes learner progress or sends analytics.

## Test-driven development

1. **Red.** Translate each behavior change or bug into a test and run it against the current version. Confirm that it fails for the expected reason. Start with the lowest test level that can show the failure.
2. **Green.** Implement the smallest change that satisfies the test. Use fixed fixtures for quest content, AI replies, storage, and network behavior so ordinary test runs are repeatable.
3. **Refactor.** Simplify with the tests passing. Rerun the focused test and the relevant wider suite. Record the commands, pass or fail results, and any browser or Canvas checks that still need to run.

Use unit tests for branch rules and stage completion, integration tests for automatic saving and course-scoped access, and browser tests for the complete student journey. Cover invalid links and codes, blocked storage, interrupted saves, refresh, resuming in a new tab, and code reissue. Verify that saved progress appears in the instructor view and each account can access only its authorized records. Check I Do captions or the text option and a We Do hint and retry. For optional You Do checks, test both feedback outcomes, retry, and skipping without a progress penalty. For content, check worked answers, source claims, and alignment with the objective and success criteria. Automate checks for missing stage content, broken branches, and invalid quest data. Use the repository's test commands as they are established.

Verify each character's role is clear at their first appearance. For each new interaction, feature, or mini-game, test that a first-time student sees the onboarding before using it, can take the first action from those instructions, and can reopen them during the activity.

Playtest each quest's engagement estimate. Exercise an asynchronous exchange with and without a peer note. Verify separate first attempts for syllabus-assigned tasks that track that distinction. Test the live AI fallback with the API unavailable and with its allowance exhausted. Verify the fixed story and canonical feedback through both paths.

## Code formatting and localization

- Use Prettier for project source, scripts, tests, and configuration. Run `bun run format` before review. `bun run check` includes the formatter check.
- Support English and Spanish. Put interface text in the typed catalogs under `src/lib/i18n` and use stable keys with named placeholders. Add both translations when introducing a shared control. Use locale-aware number and date formatting where appropriate.
- Keep translated syllabi, reference labels, or lesson text alongside the authored data and key them by the same IDs. Preserve the approved English material as the fallback until a Spanish version is available. Mark fallback text with its language and keep the chosen interface language across Canvas and standalone links.

## Modern web practices

- Consult Chrome's Modern Web Guidance before designing or reviewing changes to the web UI. Use its relevant guides during implementation. When setting up the game repository, follow the official agent setup or use the guided installer, `npx modern-web-guidance@latest install`. [Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) · [Setup for coding agents](https://developer.chrome.com/docs/modern-web-guidance/get-started)
- Target **Baseline Widely available** for core functionality. Use native HTML controls and semantic structure. Add newer functionality through progressive enhancement with a tested fallback. Test in the space Canvas gives the iframe. [Baseline](https://web.dev/baseline)
- Support keyboard navigation, visible focus, assistive-technology announcements for feedback and save status, reduced motion, and reflow at 320 CSS pixels. Provide text equivalents for essential quest actions. [Chrome accessibility guidance](https://developer.chrome.com/docs/modern-web-guidance/guides/accessibility/accessibility) · [University of Utah accessibility guidance](https://cte.utah.edu/instructor-education/accessibility-essentials/)
- Give the 3D classroom the available space between the top bar and a compact footer. Keep controls readable and scrollable on smaller screens. Keep wrapped headings, quiz prompts, choices, and feedback inside their cards with consistent padding. Check the longest text at desktop width and at 320 CSS pixels.
- Verify changed flows in a running browser. Use Chrome DevTools to inspect the layout, console, and requests. Test desktop Chromium, Firefox, and WebKit or Safari, plus a narrow mobile viewport. Exercise the standalone app and a cross-origin iframe locally, then check the actual Canvas embed before student release. [Chrome DevTools for agents](https://developer.chrome.com/docs/devtools/agents)

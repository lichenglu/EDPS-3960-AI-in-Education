# Week 2 film and archive review

*Water under the door* is one 90-second film. The first lesson heading is **I Do**. The instructor tutors an imagined student named Sam, who is learning to use clues in a story. The film asks how a machine could help the teacher understand Sam’s reasoning. At the end, Sam’s page slips into an archive drawer. Students open their first archive record in We Do. Returning learners see I Do on entry and can resume their own saved year, comparison, or proposal with one click. The stage estimates are 2, 76 and 20 minutes.

## Teaching and edit

Sam reads two sentences about Mara helping her brother escape rising water. Three designs respond to Sam’s answer about why Mara hurried. A teaching machine reveals a prepared answer for Sam to check. A tutor that follows steps could ask Sam to mark a clue in the story. A conversational tutor could ask why that clue matters. Sam explains that Mara and her brother had to leave before the water rose.

Five on-screen annotations point to evidence while the narrator is discussing it. Recorded line timings control their appearance, followed by a quiet reading hold. Spoken captions stay selectable and use a separate part of the frame. The transcript includes the narration, essential visual descriptions and the five margin notes. The English narration uses the instructor-selected CosyVoice 3 clone with relaxed conversational American English pronunciation and warm, energetic delivery. All 20 caption cues follow the recorded lines at natural speed.

## Sources and verification

The writer and proofreader checked the distinction between the learner’s own comparison in Skinner’s 1958 account and a system following entered steps in Anderson and colleagues’ 1995 work. The reading case is a teaching illustration. Doroudi’s history and the other sources are available through the film’s source list.

The learning scientist reviewed the viewing question and reading holds. The designer checked the nine shots at phone size and used the recorded cues to time the shutter, pencil, question and annotation leaders. The technologist added the annotations to the accessible transcript and updated timing and playback checks. The orchestrator reviewed the render and verified the integrated film, captions and handoff in the course.

The generator and edit timings are in `art/week-two-film`. The downloadable MP4 includes a selectable subtitle track. The course player serves the same picture and soundtrack with a separate WebVTT file.

## Final technical checks

The final web and standalone exports are 1920 × 1080 H.264 at 24 fps, exactly 90 seconds, with the CosyVoice master mixed over the original score. The standalone movie carries selectable English subtitles; the course player uses the matching 20-cue WebVTT file. The source script SHA-256 remains `9add5f4b1ec416bf03c1615b184c31fa19f367ab7f8b90a703b739fcecba04e4`.

Passed the full 67-test unit/integration suite, TypeScript checking, formatting, the production build, and all nine `intro-film.spec.ts` browser checks across Chromium, Firefox, and WebKit. Browser checks cover playback, range requests, native captions, forward/backward seeking, transcript following with captions off, keyboard scrolling, 320px reflow, text mode, and the handoff into the archive. The art viewer also passed seed/control/export checks; orientation, answer comparison, and conversation stills were inspected. Browser playback checks are muted and do not constitute a listening review.

Both final MP4s were probed at exactly 90 seconds. All 20 embedded subtitle texts match the web captions. The built player asset matches the finished web movie. The final mixed AAC peak is −4.3 dBFS.

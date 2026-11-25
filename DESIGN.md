---
version: beta
name: AI in Education
description: "Visual contract for AI in Education, a browser course game for ED PS 3960. It uses the Title and Button components from the MIT-licensed animal-island-ui library, restyled with course colors and accessibility overrides, plus the approved MIT-licensed naive-icons set and project CSS for game-specific controls. The look is cream paper, cocoa ink, raised mint actions, and round Nunito type. Its scene vocabulary is a warm, lit 3D cutaway room on a grassy plinth, with a peach dusk sky outside the window."
colors:
  cream: "#F8F8F0"
  parchment: "#F7F3DF"
  sand: "#EFE7D2"
  dot: "#E3D5B4"
  cocoa: "#794F27"
  cocoa-soft: "#725D42"
  ink: "#382D20"
  keyline: "#715632"
  mint: "#19C8B9"
  mint-deep: "#0B6B62"
  honey: "#F5B83D"
  honey-fold: "#D9962A"
  leaf: "#8FCF6B"
  meadow: "#C9E6A0"
  pine: "#4F8F5A"
  peach: "#FFC9A3"
  sky: "#FFE3C4"
  focus: "#FFCC00"
  shadow-stack: "#BDAEA0"
  alert: "#B8432F"
typography:
  ribbon: { fontFamily: "Nunito, system-ui, sans-serif", fontSize: 22px, fontWeight: 900, lineHeight: 1.2 }
  heading: { fontFamily: "Nunito, system-ui, sans-serif", fontSize: 24px, fontWeight: 800, lineHeight: 1.25 }
  speaker: { fontFamily: "Nunito, system-ui, sans-serif", fontSize: 16px, fontWeight: 800, lineHeight: 1.2 }
  dialogue: { fontFamily: "Nunito, system-ui, sans-serif", fontSize: 18px, fontWeight: 600, lineHeight: 1.55 }
  body: { fontFamily: "Nunito, system-ui, sans-serif", fontSize: 16px, fontWeight: 600, lineHeight: 1.5 }
  label: { fontFamily: "Nunito, system-ui, sans-serif", fontSize: 16px, fontWeight: 800, lineHeight: 1.25 }
  status: { fontFamily: "Nunito, system-ui, sans-serif", fontSize: 16px, fontWeight: 700, lineHeight: 1.25 }
  meta: { fontFamily: "Nunito, system-ui, sans-serif", fontSize: 14px, fontWeight: 700, lineHeight: 1.3 }
rounded: { sm: 8px, md: 12px, card: 20px, pill: 50px }
spacing: { xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, target: 44px, masthead: 56px, slip: 288px, panel: 384px, panel-max: 460px }
components:
  masthead: { backgroundColor: "{colors.cream}", textColor: "{colors.cocoa}", typography: "{typography.body}", height: "{spacing.masthead}", padding: "{spacing.md}" }
  title-ribbon: { backgroundColor: "{colors.honey}", textColor: "{colors.ink}", typography: "{typography.ribbon}", padding: "{spacing.lg}" }
  title-ribbon-instructor: { backgroundColor: "{colors.leaf}", textColor: "{colors.ink}", typography: "{typography.ribbon}", padding: "{spacing.lg}" }
  button-primary: { backgroundColor: "{colors.mint}", textColor: "{colors.ink}", typography: "{typography.label}", rounded: "{rounded.pill}", height: "{spacing.target}", padding: "{spacing.lg}" }
  button-secondary: { backgroundColor: "{colors.cream}", textColor: "{colors.cocoa}", typography: "{typography.label}", rounded: "{rounded.pill}", height: "{spacing.target}", padding: "{spacing.lg}" }
  button-disabled: { backgroundColor: "{colors.parchment}", textColor: "{colors.cocoa-soft}", typography: "{typography.label}", rounded: "{rounded.pill}", height: "{spacing.target}", padding: "{spacing.lg}" }
  input: { backgroundColor: "{colors.cream}", textColor: "{colors.ink}", typography: "{typography.body}", rounded: "{rounded.pill}", height: "{spacing.target}", padding: "{spacing.md}" }
  card: { backgroundColor: "{colors.cream}", textColor: "{colors.ink}", typography: "{typography.body}", rounded: "{rounded.card}", padding: "{spacing.lg}" }
  side-panel: { backgroundColor: "{colors.sand}", textColor: "{colors.ink}", typography: "{typography.body}", width: "{spacing.panel}", padding: "{spacing.md}" }
  dialogue-box: { backgroundColor: "{colors.parchment}", textColor: "{colors.ink}", typography: "{typography.dialogue}", rounded: "{rounded.card}", padding: "{spacing.lg}" }
  name-tag: { backgroundColor: "{colors.honey}", textColor: "{colors.ink}", typography: "{typography.speaker}", rounded: "{rounded.pill}", padding: "{spacing.md}" }
  status-saving: { backgroundColor: "{colors.cream}", textColor: "{colors.ink}", typography: "{typography.status}", rounded: "{rounded.pill}", padding: "{spacing.sm}" }
  status-saved: { backgroundColor: "{colors.cream}", textColor: "{colors.mint-deep}", typography: "{typography.status}", rounded: "{rounded.pill}", padding: "{spacing.sm}" }
  status-retry: { backgroundColor: "{colors.alert}", textColor: "{colors.cream}", typography: "{typography.status}", rounded: "{rounded.pill}", height: "{spacing.target}", padding: "{spacing.md}" }
  hotspot-label: { backgroundColor: "{colors.cream}", textColor: "{colors.cocoa}", typography: "{typography.label}", rounded: "{rounded.pill}", height: "{spacing.target}", padding: "{spacing.md}" }
  hotspot-label-active: { backgroundColor: "{colors.honey}", textColor: "{colors.ink}", typography: "{typography.label}", rounded: "{rounded.pill}", height: "{spacing.target}", padding: "{spacing.md}" }
  evidence-slip: { backgroundColor: "{colors.parchment}", textColor: "{colors.ink}", typography: "{typography.body}", rounded: "{rounded.md}", width: "{spacing.slip}", padding: "{spacing.md}" }
  source-tag: { backgroundColor: "{colors.meadow}", textColor: "{colors.ink}", typography: "{typography.label}", rounded: "{rounded.sm}", padding: "{spacing.xs}" }
---

# AI in Education · Visual Design System

AI in Education takes its paper-craft island look from [animal-island-ui](https://github.com/guokaigdg/animal-island-ui), an MIT-licensed library. The game uses that library's **Title** and **Button** components, restyled with the course colors above and accessibility overrides (ink labels, keyline focus rings, 44px targets), and ships its license notice with them. For their base structure and behavior, follow the upstream [design-system docs](https://github.com/guokaigdg/animal-island-ui/tree/main/docs/design-system). Project CSS, built from the tokens above, styles everything specific to the game: the scene frame, dialogue, hotspot labels, the save chip, the Map dialog, and the instructor tables. Icons come from naive-icons, approved for use under its MIT license, whose notice also ships with the game. Do not copy logos, icons, characters, or layouts from any commercial game. The [course brief](AGENTS.md) governs quest development, and the [README](README.md) points to the active curriculum and tests.

## Overview

Every screen is cream paper on a warm, dotted sand page. A honey swallowtail ribbon carries the title, actions are mint pills raised on a stacked shadow, and all type is round Nunito. This guide is visual direction. It sets the look of authored quests and does not add stations, locks, or actions that the quest content does not define. The scene vocabulary is a playable 3D cutaway room on a grassy plinth, used where a quest's room has been built. The room is lit warm and bright, and a peach evening sky sits over meadow hills outside its window. The classroom session is still called **First evening**, but the dusk stays outside the window. The room and the interface never turn dark.

## Colors

Expose each token as a custom property, such as `--color-mint`. Use the same hex values for 3D base colors.

- **Cream** is for cards, the masthead, and inputs. **Parchment** is for dialogue and slips. **Sand** with **dot** makes the page background.
- **Ink** is for reading text. **Cocoa** is for headings and secondary labels. **Cocoa-soft** is for timestamps and disabled text.
- **Mint** fills primary actions and is Pip's tint. **Mint-deep** is for saved status and links.
- **Honey**, **leaf**, **peach**, and **mint** tint name tags and ribbons. **Honey-fold** is only for ribbon tails.
- **Meadow**, **leaf**, and **pine** are for hills and foliage. **Peach** and **sky** are for the dusk window and the postcard.
- **Focus** and **keyline** mark focus. **Alert** marks failures and always comes with words.

| Text on background | Ratio |
| --- | --- |
| Ink on cream / parchment / sand / dot | 12.6 / 12.0 / 10.9 / 9.2 |
| Cocoa on cream / parchment / dot | 6.6 / 6.4 / 4.9 |
| Cocoa-soft on cream / parchment | 5.9 / 5.6 |
| Ink on mint / honey / leaf / peach | 6.4 / 7.5 / 7.2 / 9.0 |
| Mint-deep on cream / parchment | 6.0 / 5.7 |
| Cream on alert | 5.1 |
| Keyline against cream / mint / focus (non-text) | 6.4 / 3.3 / 4.5 |

Cream or white text on mint reaches only 2.0, so never use it. Mint, focus yellow, and honey each fall below 3:1 against cream, so any edge or ring drawn in them also needs a keyline beside it.

## Typography

Self-host Nunito as a variable WOFF2 file under the OFL, at weights 600–900, with `font-display: swap`. Do not load it from a CDN. Body text is 16px and dialogue is 18px. Compact metadata, such as timestamps, tags, and table figures, uses the 14–16px `meta` style only where its legibility has been tested at 200% zoom and in the Canvas iframe. Reading text and control labels stay at 16px or larger. Use `tabular-nums` for times and table figures. Labels that belong to objects in the room are live DOM text anchored to those objects.

## Layout

In Week 1 gameplay, the home link **AI in Education** sits by itself above the left edge of the cream masthead frame, on the page background. At desktop widths with enough room, the next row holds the small honey **Week 1** ribbon first, then the chapter title, such as **The first evening**, then the tool buttons and the save chip, with all of their vertical centers aligned. When the row runs short of space, the tools and save chip flow onto a line below. The tools are direct buttons with visible words, including **Map**, and they are not folded into a menu. The quest objective and the current station caption go next to the room or directly below it. The student-facing caption and its text name the station. The masthead does not have to stick to the top of the page, and nothing that sticks may cover controls or focused elements.

| Width | Arrangement |
| --- | --- |
| **1024px and up** | The room card sits on the left, with the objective and station caption beside it. A sand panel about 384–460px wide on the right holds the dialogue, then the actions, then any evidence. |
| **640–1023px** | The room is on top at 16:9, with no minimum viewport-height requirement. The caption and dialogue follow it. |
| **320–639px** | The layout is fluid. The room spans the full width, and the caption, dialogue, full-width buttons, and inputs follow it without horizontal scrolling. |

Spacing follows the 4/8/16/24/32 scale.

**Page frame.** Each app screen is one frame at least one viewport tall (`min-height: 100dvh`, with a `100vh` fallback). Its top and bottom gutters are equal and responsive, at `clamp(8px, 2vmin, 24px)`. The main panel grows to fill the space between the gutters. On the home screen, the closed course map fits inside the frame. When the viewport is short, the map is expanded, text is enlarged, or a quest runs long, the page scrolls naturally and content is never clipped. Static handouts are separate documents and do not use this frame.

## Entrance

The entrance is a spread on cream paper. On the home screen, the honey ribbon identifies **ED PS 3960**. The browser tab uses a 32 px PNG of the open-book icon from naive-icons. On the access-code gate, the ribbon reads **Week 1**. The ribbon, a one-line purpose, and the access-code form sit beside or above a warm arrival postcard. The postcard is a wide, original establishing shot of the room, clipped to 20px corners. At narrow widths, the title and form, or the title alone, can come before the art. The form uses visibly labeled native inputs and one mint primary button, and any error appears beside its field in words.

When WebGL is unavailable, the opening view reuses the wide postcard shot, and five close-up fallback stills cover the other stations. The alt text describes the opening view, and the native button and status text carry the live action. In every mode, the student-facing caption and text name the station the student is actually at.

## Elevation & Shapes

- **Primary buttons** use the upstream Button's stacked shadow, `0 5px 0 var(--color-shadow-stack)`. A pressed button moves down 3px, and its shadow shrinks to `0 2px 0`.
- **Secondary controls** are the only elements with soft elevation, `0 4px 12px rgb(121 79 39 / 0.14)`. This covers secondary and tool buttons and hotspot labels.
- **Cards, dialogue, panels, and tables** have no shadow, like the upstream Card. Separate them with fills, spacing, and a 2px keyline where needed.
- **Dialogs** use native `<dialog>` on a cream card with a 2px keyline. The `::backdrop` scrim is `rgb(56 45 32 / 0.45)`.
- **Corners** are 50px for pills, 20px for cards and dialogue, 12px for slips, and 8px for tags.
- **Dotted surfaces** use `radial-gradient(var(--color-dot) 1.5px, transparent 1.6px) 0 0/16px 16px` on sand. Only ink or cocoa text goes on dots.
- **The title ribbon** is the upstream Title, honey for students and leaf for instructors. Where project CSS draws the swallowtail, use `polygon(0 0,100% 0,calc(100% - 14px) 50%,100% 100%,0 100%,14px 50%)` with honey-fold tails. Week 1 sets the pattern for every ribbon stacked over an H1, including the home title and the entrance. The ribbon spans its title from tip to tip, centers the label, and reserves the fold depth at both ends so the text never runs into a tail or fold. On the two-line home title, the ribbon spans the widest line. The compact play masthead instead sets a small week ribbon, sized to its label with the same fold depth at both ends, before the chapter title on the same row. The ribbon and title share a vertical center, clear space surrounds both folded tips so neither touches the masthead edge or the title, and when space is constrained the title wraps within its own side while the ribbon stays on one line. An instructor banner that contains the whole heading fills its allotted heading row.

## Components

**Buttons.** A primary button is mint with an ink label. A secondary button is cream with a cocoa label. A disabled button is parchment with cocoa-soft text and a 2px dashed keyline, and it has no shadow.

**Form controls.** Inputs are cream pills with a 2px keyline and a visible label. Keep native controls and their behavior, with targets at least 44px. Inputs fill their container (`width: 100%; min-width: 0`) and must stay fully usable at 320px.

**Focus.** Inputs get a 3px focus-yellow ring outside the keyline. Buttons and hotspots get `0 0 0 2px cream, 0 0 0 5px mint, 0 0 0 7px keyline`. Focus is never clipped.

**Dialogue.** A parchment card has a tinted name tag over its top-left edge. The tag reads `Name · Role label`, using the role label from the quest content. Feedback is written out: it says what happened and what to try next, and it never relies on color alone. When a scene has captions or a transcript, captions run on a parchment strip at the scene's lower edge. The transcript opens in a dialog, and closing it returns focus to the button that opened it.

**Hotspots.** The scene's inspect pill, a cream `hotspot-label`, stays visible. The outline and feedback match the states the object actually has. Where an object has them, use a 3px honey outline with a 1px ink edge for ready, a dashed keyline for focus, and `hotspot-label-active` for active. Do not invent states, and no special animation mechanism is required to show them. Each hotspot mirrors a native button that triggers the same action.

**Evidence.** Where a quest shows evidence, it appears on a parchment slip no wider than 288px, with a meadow source tag.

**Map.** The native Map dialog lists stations by name. Visited stops use full-row buttons with a cocoa label and chevron. The current stop uses a leaf tint and **You are here**. During a visit, **Saved place** returns the student to the active stop. A review uses the original scene, dialogue, and activity layout. Practice choices and their evidence selections can be changed in place. The saved selection and feedback update after the change. Written responses appear in their original read-only fields. **Go to supply table** takes the student to the live opening activity or its saved evidence. **Continue** follows the chapter through previously reached steps. **Return to quest** restores the live scene.

**Guide.** Cues use the `@rc-component/tour` engine from Ant Design Tour. Each prompt uses a paper (`#fffaf0`) card, 2px cocoa keyline, 16px corners, compact soft shadow, at most 21rem, viewport-inset, auto-placed above or below. The control takes a mint (`#148176`) outline. The surrounding scene and its controls stay visible and usable. A native **Dismiss guide** button, or Escape on cue or control, closes it. Brief cues show automatically during the first investigation, following the saved record. **How this works** replays the opening walkthrough from its first cue in a visibly labeled **Walkthrough** view. **Return to quest** stays available throughout and brings the student back to the saved scene. Replay actions run in an isolated demonstration and never write quest progress. Other steps offer collapsible **Activity instructions** with an optional **Point to the next action** cue. Each works the same at 320px and in Text view. Map, Notebook, and Transcript stay dialogs.

**Dialogue lines.** Step with 44px naive-icons left/right chevron buttons carrying accessible labels. Keep the line count and a written **Start the investigation** action. Reload restores the last dialogue line in the saved scene. Going back to a station reopens the last reviewed activity there, or the most recent completed activity on a first revisit. A review already open in the same tab resumes at that scene. The separate walkthrough starts at line 1.

**Instructor views.** These views use the same masthead, with the leaf ribbon and the word "Instructor." Roster tables sit on shadowless cream cards. Rows are at least 44px tall, with parchment zebra striping. Status cells show the stored status as text, and last-save times use tabular figures. Mockups use synthetic names only.

**Data states.** Loading shows the words "Loading…". An empty view shows a one-line hint. An error appears on a cream card with a 2px alert border, an explanation in words, and a **Try again** button.

**Save chip.** One polite live region carries the save status. **Saving** is ink text with a clock icon. **Saved** is mint-deep text with a check icon and the time in cocoa-soft. **Retry save** is an alert pill with a warning icon and a 2px keyline, and it stays until the save succeeds.

## The room and scenery

These are the visual requirements for any quest room that gets built. They do not mean every quest already has one.

- **Room.** A matte cutaway shown in orthographic three-quarter view at 30–35° of elevation. It has cream walls, a birch floor, and mint and honey accents. One warm key light, a soft fill, and baked ambient occlusion give low-contrast contact shadows. Roughness is 0.6–0.9.
- **Plinth.** A rounded leaf-green plinth with a cocoa soil edge, ringed by round pine and leaf bushes.
- **Window.** A sky-to-peach gradient over three hill layers in meadow, leaf, and pine.
- **Page scenery.** Hills and foliage outside the canvas are inline SVG or CSS.

## 3D asset standards

Use the current Week 1 studio at `/quests/w01` as the visual reference for every new room, character, and prop. Inspect the classroom and its materials in the [Blender scene](art/classroom-studio/classroom.blend). Use the [Spline examples](https://spline.design/examples) for secondary inspiration and build original course assets.

- **Shape and detail.** Use rounded silhouettes, softly beveled furniture, and broad, simplified details. Give props enough shape to identify them from the player camera. Size them against nearby desks, chairs, and characters so they make sense on the surfaces where they belong.
- **Color and materials.** Match the classroom’s matte, clay-like surfaces. Use cream, birch, and cocoa for base surfaces and leaf, mint, peach, or honey for accents. Check colors under the game's warm lighting and keep faces, signs, and interactive objects readable.
- **Characters.** Follow the chibi proportions and facial cues below. Preserve each species’ distinguishing silhouette and markings. Match the established character's face, colors, and relative scale when they return in a new week.
- **In-game review.** Compare the new asset and a similar Week 1 asset at the usual player camera distance. Check that it sits on its floor or surface, leaves walking routes clear, and stays visible when approached. For interactives, verify that the visible object, hover highlight, click target, and collision area agree.

## Characters

The cast is a visual vocabulary for quests that use it. Characters are chibi figures two to two-and-a-half heads tall. They have dot eyes with highlights, peach blush, cream muzzles, and one prop each.

| Speaker tag | Cues | Tag tint |
| --- | --- | --- |
| **Chenglu · Center director** | Giant panda, honey scarf, ledger | Honey |
| **Yinqi · Peer tutor** | Red panda, ringed tail, chalk pencil | Peach |
| **Eunseo · Workshop volunteer** | Golden snub-nosed monkey, pale blue face, kit bag, index cards | Leaf |
| **Pip · AI tutor** | A teal pangolin face on a monitor. The **Pip · AI tutor** name tag and opening line identify the tutor and explain the test. Pip's first line is a self-introduction that begins “I’m Pip, the AI tutor Chenglu is testing.” Where a quest uses the monitor, its face vocabulary is idle, waiting, replying, and replay, each with a text label. | Mint |

The guests are Gokhan the capybara, Xinlin the pangolin with amber scales, and Guimin the crested ibis. They use honey, leaf, and peach tints, and each one brings a prop and a scripted role label.

## Motion

Presses and props ease out over 180–300ms. When the camera moves, the move takes about 500ms. Not every action needs a camera move. If characters idle, they bob gently, no more than 3px. No special animation mechanism is required. Under `prefers-reduced-motion`, the camera and props jump to their end state, characters hold still, and spinners become static icons.

## Responsive & Accessibility

- Reflow down to 320 CSS px and support 200% text zoom without losing content or actions.
- Keep targets at least 44 × 44px.
- Keyboard order runs through the masthead tools, then the room and its caption, then the panel. Every 3D action has a native button.
- **Text view** presents the same evidence and actions in reading order.
- Show every outcome in text.
- Never signal state by color alone.

## Do's and Don'ts

- **Do** put ink on mint. **Don't** put white text on mint.
- **Do** pair yellow and mint rings with the keyline. **Don't** remove focus outlines.
- **Do** keep cards flat and save soft elevation for secondary controls.
- **Do** keep the dusk outside the window. **Don't** darken the room or the UI.
- **Do** show actual statuses in words. **Don't** show progress the server hasn't saved.
- **Do** keep a failed save visible until it is retried.

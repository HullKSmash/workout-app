# Guidance & Tips Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated, variant-specific "Guidance & Tips" reading screen, populated for the equestrian variant from its source doc, reachable from the existing Guidance card.

**Architecture:** Content lives in a new data module (`guidance.js`) keyed by variant key. A new self-contained presentational component (`GuidanceScreen.jsx`) renders a section/sub-section tree. `workout-app.jsx` gets minimal wiring: a `"guidance"` screen state, return-tracking, and the existing Guidance card converted from a collapsible placeholder into a navigation button (hidden when the variant has no guidance).

**Tech Stack:** React (Vite SPA), inline JS styles. **No test runner exists** in this repo, so each task is verified with `npm run build` (catches import/syntax errors) plus, in the final task, manual verification in the Vite dev server / preview. Spec: [docs/superpowers/specs/2026-06-29-guidance-tips-screen-design.md](../specs/2026-06-29-guidance-tips-screen-design.md).

---

## File Structure

- **Create `guidance.js`** (repo root, alongside `variants.js`) — exports `GUIDANCE`, keyed by variant key; equestrian content only for now.
- **Create `GuidanceScreen.jsx`** (repo root, alongside `workout-app.jsx`) — pure presentational component; owns its own inline styles computed from `accent`/`accentLight` props.
- **Modify `workout-app.jsx`** — imports, `guidance` lookup, `"guidance"` screen state + `guidanceReturn`, convert the two Guidance cards to nav buttons (guarded by `guidance`), add the render block, remove now-dead `guideOpen` state and `guideBody`/`guidePlaceholder` styles.

---

## Task 1: Create the guidance content module

**Files:**
- Create: `guidance.js`

- [ ] **Step 1: Write `guidance.js`**

The section schema is `{ title, body?, subsections? }` where `body` is an array of paragraph strings and `subsections` is an array of the same shape. Content is transcribed verbatim from the source doc.

```js
// Variant-specific "Guidance & Tips" content, keyed by variant key (same keys
// as VARIANTS in variants.js). Each entry has an ordered list of sections.
//
// Section shape: { title, body?, subsections? }
//   - body: array of paragraph strings
//   - subsections: array of the same Section shape (one level deep in practice)
//
// Variants without an entry here simply have no guidance screen (the card is
// hidden). Add runner/paul entries with the same shape when their docs exist.
export const GUIDANCE = {
  equestrian: {
    sections: [
      {
        title: "This is your workout",
        body: [
          "Above all else, these are YOUR workouts - the objective is to support improvement in your riding with targeted strength training. This involves dedicated work, but shouldn't be so hard that you're regularly too sore to ride or do other exercise. You might feel some soreness when you add in new exercises or ramp up your weights, but it shouldn't be debilitating and shouldn't happen with every workout in the long term. If you're getting too sore or tired to ride or do your regular activities, or find yourself starting to avoid strength training, you're going too hard - start easier!",
          "Further, consider every workout an opportunity to listen to your body and adjust your plan accordingly. This not only helps you hit the sweet spot of seeing progress without overdoing it; paying attention to your body will help your overall coordination, control, balance, and proprioception, all of which will help your riding. Take the chance to practice here!",
        ],
      },
      {
        title: "Reps & choosing weights",
        body: [
          "With the above in mind, consider that rep ranges are guidance for how hard each rep should be. By the last rep or two, you should be feeling like it would be hard to do more without compromising your form. If you get to the top of the range and feel like you hardly worked, pick up a heavier weight to fatigue in fewer reps (and make sure your form is correct such that you didn't take a shortcut). If you can't get to the bottom of the rep range without losing your form, use a lighter weight or only bodyweight.",
          "Your repetitions and weights may (and almost certainly will) consequently vary from day to day. If you worked hard yesterday, you might have some soreness today and choose a lighter weight to support your recovery. If you're full of energy today, it might be the day to pick up that heavier weight for the first time. Be your own coach in these moments and prioritize your long-term progress.",
        ],
        subsections: [
          {
            title: "“To Fatigue”",
            body: [
              "Some exercises are marked as “To Fatigue” instead of having a range of reps. These are generally bodyweight exercises that will have a huge variation in where you start and end up based on your specific musculoskeletal makeup and proportions. To work to fatigue, do as many as you can without compromising correct form. Over time, you'll add more reps as you get stronger (and your form will tighten up, even if it started out correct); when you can do so many that it's becoming boring or untenable for your schedule, then it's time for a harder variation.",
            ],
          },
        ],
      },
      {
        title: "Technique",
        subsections: [
          {
            title: "Go slow",
            body: [
              "Over time of moving through the world and riding, we all develop unconscious movement patterns that favor certain muscles at the expense of others. Strength training is an opportunity to shape these patterns by intentionally engaging and building the muscles we want to do the heavy lifting while ensuring smaller, stabilizing muscles get attention and neural activation.",
              "Moving slowly and with conscious control through your workout ensures you're working the muscles and shaping the patterns you want. It also gives you the opportunity to practice and improve your proprioception - the awareness of where your body parts are and what they're doing without looking at them, which you already know or can imagine is a foundational skill for riding. Use a mirror or record yourself to check your form and compare it to the demo videos as you're learning exercises.",
            ],
          },
          {
            title: "Relax non-working muscles",
            body: [
              "When performing an exercise, make a point to relax the parts of your body that aren't working. This is how you practice that strong but relaxed position in the saddle, where you can be using your leg while keeping your hand soft. Key body parts that tend to tense when other parts are working are your face, neck, shoulders, hands, and feet. Finding an intentional but natural breathing rhythm can help you here - make a point to relax on each exhale.",
            ],
          },
          {
            title: "Maintain your posture",
            body: [
              "One exception to the above rule is that you generally want to keep your core and postural muscles engaged - not overly tense such that you're actively thinking about them and feeling a burn outside of focused exercises on those muscles, but enough that you maintain spinal alignment and support. If these muscles are underdeveloped, this might be hard to do at first. It gets easier with practice. As a rider, you're probably familiar with keeping your upper body tall and your core stable nearly regardless of what the rest of your body is doing.",
            ],
          },
        ],
      },
    ],
  },
};
```

- [ ] **Step 2: Verify it parses**

Run: `node --input-type=module -e "import('./guidance.js').then(m => console.log(m.GUIDANCE.equestrian.sections.length, m.GUIDANCE.equestrian.sections[1].subsections[0].title))"`
Expected: `3 “To Fatigue”`

- [ ] **Step 3: Commit**

```bash
git add guidance.js
git commit -m "Add guidance content module with equestrian tips"
```

---

## Task 2: Create the GuidanceScreen component

**Files:**
- Create: `GuidanceScreen.jsx`

- [ ] **Step 1: Write `GuidanceScreen.jsx`**

Pure presentational component. Owns its own styles (computed from `accent`/`accentLight`). Renders a back header, then each section; a shared `Section` renderer handles both top-level sections and indented sub-sections via a `nested` flag.

```jsx
// Dedicated, scrollable "Guidance & Tips" reading screen. Pure presentational:
// given variant guidance content + accent colors + an onBack handler, it renders
// the section tree. Kept out of workout-app.jsx so that file doesn't grow another
// full screen; the content itself lives in guidance.js.

const TEXT = "#2D2A26";
const TEXT_SECONDARY = "#8A8279";
const BG = "#FAF8F5";

function Section({ section, nested, accent, accentLight }) {
  const s = makeStyles(accent, accentLight);
  return (
    <div style={nested ? s.subSection : s.section}>
      <h2 style={nested ? s.subHeading : s.heading}>{section.title}</h2>
      {(section.body ?? []).map((para, i) => (
        <p key={i} style={s.para}>
          {para}
        </p>
      ))}
      {(section.subsections ?? []).map((sub, i) => (
        <Section
          key={i}
          section={sub}
          nested
          accent={accent}
          accentLight={accentLight}
        />
      ))}
    </div>
  );
}

export default function GuidanceScreen({ guidance, accent, accentLight, onBack }) {
  const s = makeStyles(accent, accentLight);
  return (
    <div style={s.screen}>
      <div style={s.content}>
        <button style={s.backButton} onClick={onBack}>
          ‹ Back
        </button>
        <h1 style={s.title}>Guidance &amp; Tips</h1>
        {guidance.sections.map((section, i) => (
          <Section
            key={i}
            section={section}
            accent={accent}
            accentLight={accentLight}
          />
        ))}
      </div>
    </div>
  );
}

function makeStyles(accent, accentLight) {
  return {
    screen: {
      minHeight: "100vh",
      maxWidth: 480,
      margin: "0 auto",
      background: BG,
      fontFamily: "'DM Sans', sans-serif",
    },
    content: {
      padding: "16px 24px 48px",
    },
    backButton: {
      fontFamily: "'DM Sans', sans-serif",
      background: "none",
      border: "none",
      color: TEXT_SECONDARY,
      fontSize: 15,
      fontWeight: 500,
      cursor: "pointer",
      padding: "8px 0",
      WebkitTapHighlightColor: "transparent",
    },
    title: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 30,
      fontWeight: 800,
      letterSpacing: "-0.02em",
      color: accent,
      margin: "8px 0 16px 0",
    },
    section: {
      marginBottom: 28,
    },
    heading: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 20,
      fontWeight: 700,
      color: TEXT,
      margin: "0 0 8px 0",
    },
    para: {
      fontSize: 15,
      lineHeight: 1.6,
      color: TEXT,
      margin: "0 0 12px 0",
    },
    subSection: {
      marginTop: 16,
      marginBottom: 4,
      paddingLeft: 14,
      borderLeft: `3px solid ${accentLight}`,
    },
    subHeading: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 16,
      fontWeight: 700,
      color: accent,
      margin: "0 0 6px 0",
    },
  };
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: build succeeds with no errors (the component is not yet imported, but Vite will still type-check/transform it once imported in Task 3; this step just confirms the file is syntactically valid by building the project — it should already pass).

Note: Vite only bundles imported modules, so an unused file won't be caught by build alone. Confirm validity instead with:
Run: `npx esbuild GuidanceScreen.jsx --bundle --format=esm --external:react --outfile=/dev/null`
Expected: no errors (a `done` summary line).

- [ ] **Step 3: Commit**

```bash
git add GuidanceScreen.jsx
git commit -m "Add GuidanceScreen presentational component"
```

---

## Task 3: Wire the screen into the app

**Files:**
- Modify: `workout-app.jsx`

- [ ] **Step 1: Add imports**

Find (top of file, after line 7):

```jsx
import { useWakeLock } from "./hooks/useWakeLock";
```

Replace with:

```jsx
import { useWakeLock } from "./hooks/useWakeLock";
import { GUIDANCE } from "./guidance";
import GuidanceScreen from "./GuidanceScreen";
```

- [ ] **Step 2: Add the module-level guidance lookup**

Find:

```jsx
const variantKey =
  Object.keys(VARIANTS).find((k) => VARIANTS[k] === variant) ?? "default";
```

Replace with:

```jsx
const variantKey =
  Object.keys(VARIANTS).find((k) => VARIANTS[k] === variant) ?? "default";
// Guidance content for this variant, or undefined if none authored yet.
const guidance = GUIDANCE[variantKey];
```

- [ ] **Step 3: Replace `guideOpen` state with return-tracking state**

Find:

```jsx
  const [guideOpen, setGuideOpen] = useState(false);
```

Replace with:

```jsx
  // Which screen the Guidance & Tips screen returns to (library or schedule).
  const [guidanceReturn, setGuidanceReturn] = useState("library");
```

- [ ] **Step 4: Update the screen-state comment**

Find:

```jsx
  const [screen, setScreen] = useState(hasLibrary ? "library" : "select"); // library | schedule | select | landing | workout | complete
```

Replace with:

```jsx
  const [screen, setScreen] = useState(hasLibrary ? "library" : "select"); // library | schedule | guidance | select | landing | workout | complete
```

- [ ] **Step 5: Convert the library Guidance card to a nav button**

Find (the library screen's Guidance card):

```jsx
            {/* Guidance & Tips card */}
            <div style={styles.guideCard}>
              <button
                style={styles.guideToggle}
                onClick={() => setGuideOpen((v) => !v)}
              >
                <div style={styles.guideToggleLeft}>
                  <span style={styles.guideIcon}>📋</span>
                  <div>
                    <div style={styles.guideTitle}>Guidance &amp; Tips</div>
                    <div style={styles.guideSubtitle}>How to use this library</div>
                  </div>
                </div>
                <span style={styles.guideChevron}>{guideOpen ? "∧" : "∨"}</span>
              </button>
              {guideOpen && (
                <div style={styles.guideBody}>
                  <p style={styles.guidePlaceholder}>Guidance coming soon.</p>
                </div>
              )}
            </div>
```

Replace with:

```jsx
            {/* Guidance & Tips card — navigates to the dedicated screen */}
            {guidance && (
              <div style={styles.guideCard}>
                <button
                  style={styles.guideToggle}
                  onClick={() => {
                    setGuidanceReturn("library");
                    setScreen("guidance");
                  }}
                >
                  <div style={styles.guideToggleLeft}>
                    <span style={styles.guideIcon}>📋</span>
                    <div>
                      <div style={styles.guideTitle}>Guidance &amp; Tips</div>
                      <div style={styles.guideSubtitle}>How to use this library</div>
                    </div>
                  </div>
                  <span style={styles.guideChevron}>›</span>
                </button>
              </div>
            )}
```

- [ ] **Step 6: Convert the schedule Guidance card to a nav button**

Find (the schedule screen's Guidance card):

```jsx
            {/* Program guide collapsible */}
            <div style={styles.guideCard}>
              <button
                style={styles.guideToggle}
                onClick={() => setGuideOpen((v) => !v)}
              >
                <div style={styles.guideToggleLeft}>
                  <span style={styles.guideIcon}>📋</span>
                  <div>
                    <div style={styles.guideTitle}>Guidance &amp; Tips</div>
                    <div style={styles.guideSubtitle}>Schedule, weight guidance, and technique</div>
                  </div>
                </div>
                <span style={styles.guideChevron}>{guideOpen ? "∧" : "∨"}</span>
              </button>
              {guideOpen && (
                <div style={styles.guideBody}>
                  <p style={styles.guidePlaceholder}>Program guide coming soon.</p>
                </div>
              )}
            </div>
```

Replace with:

```jsx
            {/* Guidance & Tips card — navigates to the dedicated screen */}
            {guidance && (
              <div style={styles.guideCard}>
                <button
                  style={styles.guideToggle}
                  onClick={() => {
                    setGuidanceReturn("schedule");
                    setScreen("guidance");
                  }}
                >
                  <div style={styles.guideToggleLeft}>
                    <span style={styles.guideIcon}>📋</span>
                    <div>
                      <div style={styles.guideTitle}>Guidance &amp; Tips</div>
                      <div style={styles.guideSubtitle}>Schedule, weight guidance, and technique</div>
                    </div>
                  </div>
                  <span style={styles.guideChevron}>›</span>
                </button>
              </div>
            )}
```

- [ ] **Step 7: Add the guidance render block**

Find (start of the select screen block):

```jsx
      {screen === "select" && (
```

Replace with:

```jsx
      {/* ── Guidance & Tips ──────────────────────────────────────────── */}
      {screen === "guidance" && guidance && (
        <GuidanceScreen
          guidance={guidance}
          accent={variant.accent}
          accentLight={variant.accentLight}
          onBack={() => setScreen(guidanceReturn)}
        />
      )}

      {screen === "select" && (
```

- [ ] **Step 8: Remove the now-dead guide styles**

Find:

```jsx
  guideBody: {
    padding: "0 20px 16px",
  },

  guidePlaceholder: {
    fontSize: 14,
    color: colors.textSecondary,
    margin: 0,
    fontStyle: "italic",
  },
```

Replace with: (nothing — delete this block, including the trailing blank line)

- [ ] **Step 9: Verify build and check for leftover references**

Run: `npm run build`
Expected: build succeeds with no errors.

Run: `grep -n "guideOpen\|setGuideOpen\|guideBody\|guidePlaceholder" workout-app.jsx`
Expected: no output (all references removed).

- [ ] **Step 10: Commit**

```bash
git add workout-app.jsx
git commit -m "Wire Guidance & Tips screen into app navigation"
```

---

## Task 4: Verify in the running app

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Vite serves the app (note the local URL, e.g. `http://localhost:5173`).

- [ ] **Step 2: Verify equestrian — library entry**

Open `http://localhost:5173/?variant=equestrian`. Confirm:
- The "Guidance & Tips" card appears at the bottom of the library screen with a `›` arrow (no chevron, no "coming soon").
- Tapping it opens the guidance screen showing the title, the three top-level sections (This is your workout, Reps & choosing weights, Technique), with "To Fatigue" indented under Reps & choosing weights and the three technique tips indented under Technique.
- Tapping "‹ Back" returns to the **library** screen.

- [ ] **Step 3: Verify equestrian — schedule entry**

From the library screen, tap "Looking for more structure? Follow a 12-week program here!" to reach the schedule screen. Confirm:
- The Guidance card appears there too.
- Tapping it opens the same guidance screen.
- "‹ Back" returns to the **schedule** screen (not library).

- [ ] **Step 4: Verify runner/paul have no card**

Open `http://localhost:5173/?variant=run` and `http://localhost:5173/?variant=paul`. Confirm the Guidance & Tips card is **not** shown (guidance not authored for these variants).

- [ ] **Step 5: Stop the server**

Stop `npm run dev` (Ctrl-C).

---

## Self-Review (completed by plan author)

- **Spec coverage:** content model → Task 1; GuidanceScreen component + props + recursive section render → Task 2; lookup, `"guidance"` screen state, return-tracking, card-as-nav, hide-when-absent, render block → Task 3; equestrian + runner/paul verification → Task 4. All spec sections covered.
- **Placeholder scan:** none — full code and exact commands in every step.
- **Type consistency:** `guidance` shape (`{ sections: [{ title, body?, subsections? }] }`) is consistent across `guidance.js`, the `GuidanceScreen`/`Section` props, and the `<GuidanceScreen guidance=… accent=… accentLight=… onBack=… />` call site. `guidanceReturn` is set to `"library"`/`"schedule"` and consumed by `onBack`.

# Guidance & Tips Screen — Design

**Date:** 2026-06-29
**Status:** Approved (pending spec review)

## Problem

Each variant (equestrian, runner, paul) has a "Guidance & Tips" document — coaching
philosophy and technique advice the user reads to understand how to use their workouts.
Today the app only has a placeholder: a collapsible "Guidance & Tips" card on the library
and schedule screens that shows "Guidance coming soon."

We need to present this content for real, starting with the equestrian variant, in a way
that scales to the other variants as their docs are written.

## Decisions

- **Container:** a dedicated screen (navigated to, with a Back control), consistent with
  the app's existing multi-screen model (library / schedule / landing / workout / complete).
  Chosen over an inline accordion (cramps the library feed with ~2 pages of prose) and a
  slide-up sheet (introduces an overlay component the app doesn't otherwise have).
- **Within-screen layout:** all sections expanded, scrollable top-to-bottom. Sub-points are
  indented under their parent with a left-border treatment. Chosen over a collapsible
  accordion because this is reference reading material — hiding it behind taps adds friction.
- **Content model:** a shared, per-variant section schema (same section shape across variants,
  different wording).
- **Component placement:** the screen is its own component file (`GuidanceScreen.jsx`), not
  added to the already-large `workout-app.jsx`. It is a pure presentational component with a
  clean interface, so it extracts cleanly. We deliberately do NOT refactor the other screens.

## Content Model — `guidance.js` (new file)

A single module exporting guidance content keyed by variant key (the keys already used in
`variants.js` / `variantKey` in `workout-app.jsx`).

```js
export const GUIDANCE = {
  equestrian: {
    sections: [ /* Section[] */ ],
  },
  // run, paul: added later — same shape
};
```

**Section schema** (recursive, one level of nesting used):

```
Section = {
  title: string,
  body?: string[],        // array of paragraphs
  subsections?: Section[], // same shape; one level deep in practice
}
```

- `body` is an array of paragraph strings, rendered as separate `<p>` elements.
- `subsections` renders indented under the parent with the green left-border treatment.
- A section may have `body` only (e.g. "This is your workout"), `body` + `subsections`
  (e.g. "Reps & choosing weights" → "To Fatigue"), or `subsections` only (e.g. "Technique").

The full equestrian copy is transcribed verbatim from the source PDF — see Appendix A.
`run` and `paul` are simply absent from `GUIDANCE` until their docs are written.

## Navigation & Lookup — `workout-app.jsx` changes (minimal)

- Resolve content: `const guidance = GUIDANCE[variantKey];` (undefined when not authored).
- Add `"guidance"` to the `screen` state union.
- Add return-tracking state, e.g. `const [guidanceReturn, setGuidanceReturn] = useState("library");`
  so Back returns to whichever screen hosted the card (library *or* schedule).
- The existing "Guidance & Tips" card (library at ~line 412, schedule at ~line 455):
  - **Only renders when `guidance` exists.** For variants without guidance yet (run/paul),
    the card is hidden — no "coming soon" dead-ends.
  - Becomes a navigation button: `onClick={() => { setGuidanceReturn(screen); setScreen("guidance"); }}`.
  - This replaces the current `guideOpen` collapsible behavior; the `guideOpen` state and the
    inline `guideBody`/placeholder markup are removed.
- New render block: `{screen === "guidance" && guidance && (
    <GuidanceScreen guidance={guidance} accent={...} accentLight={...} onBack={() => setScreen(guidanceReturn)} /> )}`.

## Component — `GuidanceScreen.jsx` (new file)

Pure presentational component matching the file's inline-style convention.

- **Props:** `{ guidance, accent, accentLight, onBack }`.
- **Owns its own inline styles**, computed from `accent` / `accentLight` props (no dependency
  on the module-scope `styles` object in `workout-app.jsx`).
- **Renders:**
  - A header row: a `‹ Back` control (calls `onBack`) + the title "Guidance & Tips".
  - `guidance.sections` mapped to section blocks: heading (`title`), paragraphs (`body`),
    then any `subsections` rendered through the same path, indented with a green left border.
- A single recursive/shared render path for sections and sub-points keeps the structure
  consistent and avoids duplicated markup.

Styles introduced (on the component): screen container, back button, section heading,
paragraph, sub-section wrapper (left border), sub-section heading.

## Out of Scope

- No persistence, no analytics.
- No per-exercise demo-video links. (The equestrian copy references "demo videos"; those are
  a separate, blocked roadmap item — the text mention stays, but no linking is built here.)
- No refactor of the library/schedule/workout screens.
- Runner and Paul guidance content (added later via the same model).

## Testing / Verification

The app has no test suite. Verify via the dev server + preview:
- Equestrian variant (`?variant=equestrian`): card appears on library and schedule, navigates
  to the guidance screen, content renders with correct hierarchy ("To Fatigue" nested under
  Reps & choosing weights; the three technique tips nested under Technique), Back returns to
  the originating screen.
- Runner/Paul variants (`?variant=run`, `?variant=paul`): no guidance card shown.

---

## Appendix A — Equestrian content (verbatim from source PDF)

### This is your workout
> Above all else, these are YOUR workouts - the objective is to support improvement in your
> riding with targeted strength training. This involves dedicated work, but shouldn't be so
> hard that you're regularly too sore to ride or do other exercise. You might feel some
> soreness when you add in new exercises or ramp up your weights, but it shouldn't be
> debilitating and shouldn't happen with every workout in the long term. If you're getting too
> sore or tired to ride or do your regular activities, or find yourself starting to avoid
> strength training, you're going too hard - start easier!

> Further, consider every workout an opportunity to listen to your body and adjust your plan
> accordingly. This not only helps you hit the sweet spot of seeing progress without overdoing
> it; paying attention to your body will help your overall coordination, control, balance, and
> proprioception, all of which will help your riding. Take the chance to practice here!

### Reps & choosing weights
> With the above in mind, consider that rep ranges are guidance for how hard each rep should
> be. By the last rep or two, you should be feeling like it would be hard to do more without
> compromising your form. If you get to the top of the range and feel like you hardly worked,
> pick up a heavier weight to fatigue in fewer reps (and make sure your form is correct such
> that you didn't take a shortcut). If you can't get to the bottom of the rep range without
> losing your form, use a lighter weight or only bodyweight.

> Your repetitions and weights may (and almost certainly will) consequently vary from day to
> day. If you worked hard yesterday, you might have some soreness today and choose a lighter
> weight to support your recovery. If you're full of energy today, it might be the day to pick
> up that heavier weight for the first time. Be your own coach in these moments and prioritize
> your long-term progress.

#### "To Fatigue"
> Some exercises are marked as "To Fatigue" instead of having a range of reps. These are
> generally bodyweight exercises that will have a huge variation in where you start and end up
> based on your specific musculoskeletal makeup and proportions. To work to fatigue, do as many
> as you can without compromising correct form. Over time, you'll add more reps as you get
> stronger (and your form will tighten up, even if it started out correct); when you can do so
> many that it's becoming boring or untenable for your schedule, then it's time for a harder
> variation.

### Technique

#### Go slow
> Over time of moving through the world and riding, we all develop unconscious movement
> patterns that favor certain muscles at the expense of others. Strength training is an
> opportunity to shape these patterns by intentionally engaging and building the muscles we
> want to do the heavy lifting while ensuring smaller, stabilizing muscles get attention and
> neural activation.

> Moving slowly and with conscious control through your workout ensures you're working the
> muscles and shaping the patterns you want. It also gives you the opportunity to practice and
> improve your proprioception - the awareness of where your body parts are and what they're
> doing without looking at them, which you already know or can imagine is a foundational skill
> for riding. Use a mirror or record yourself to check your form and compare it to the demo
> videos as you're learning exercises.

#### Relax non-working muscles
> When performing an exercise, make a point to relax the parts of your body that aren't
> working. This is how you practice that strong but relaxed position in the saddle, where you
> can be using your leg while keeping your hand soft. Key body parts that tend to tense when
> other parts are working are your face, neck, shoulders, hands, and feet. Finding an
> intentional but natural breathing rhythm can help you here - make a point to relax on each
> exhale.

#### Maintain your posture
> One exception to the above rule is that you generally want to keep your core and postural
> muscles engaged - not overly tense such that you're actively thinking about them and feeling
> a burn outside of focused exercises on those muscles, but enough that you maintain spinal
> alignment and support. If these muscles are underdeveloped, this might be hard to do at
> first. It gets easier with practice. As a rider, you're probably familiar with keeping your
> upper body tall and your core stable nearly regardless of what the rest of your body is
> doing.

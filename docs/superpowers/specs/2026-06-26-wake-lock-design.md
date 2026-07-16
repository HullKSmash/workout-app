# Keep Screen Awake During Active Workouts

**Date:** 2026-06-26
**Status:** Approved, ready for implementation plan

## Goal

On mobile, keep the device screen on (prevent auto-lock/sleep) while the user is
in an active workout. The screen should be allowed to sleep normally on every
other screen: workout library, program/schedule, select, landing (workout
start), and complete (finish) pages.

## Decisions

- **Browser support: native only.** Use the standard Screen Wake Lock API
  (`navigator.wakeLock`). Supported on iOS Safari 16.4+ and modern Android.
  Older browsers (e.g. iOS < 16.4) silently do nothing — no video-hack fallback,
  no third-party library. Keeping the screen awake is an enhancement, not a
  requirement.
- **Re-acquire on return: yes.** The OS automatically releases the wake lock
  whenever the page is hidden (phone auto-lock, app switch, incoming call). When
  the page becomes visible again and the user is still in an active workout, the
  lock is re-requested.
- **Implementation shape: custom hook** (`useWakeLock(active)`) in its own file,
  rather than inline plumbing in the main component or a non-React util module.

## Active-workout definition

The app tracks a single `screen` state variable in `workout-app.jsx`
(`library | schedule | select | landing | workout | complete`). "Active workout"
maps exactly to `screen === "workout"`. Rest steps render inside the workout
screen, so they are covered automatically. No new state is introduced.

## Components

### New file: `hooks/useWakeLock.js`

`useWakeLock(active)` — a side-effect-only hook (no state, no re-renders).

- Holds a `useRef` for the wake lock sentinel object.
- A `useEffect` keyed on `active`:
  - Feature-detect `navigator.wakeLock` up front; if absent, do nothing.
  - When `active` is true, request `navigator.wakeLock.request("screen")` and
    store the returned sentinel in the ref.
  - Register a `visibilitychange` listener: if the document becomes `visible`
    while `active` is still true, re-request the lock.
  - Cleanup (when `active` flips to false, or on unmount): remove the listener
    and call `sentinel.release()`, clearing the ref.
- **Error handling:** the Wake Lock API is async and can reject (low battery,
  permission, etc.). Wrap every request in `try/catch` and no-op on failure. A
  failed lock must never interrupt or break the workout.

### Call site: `workout-app.jsx`

A single line alongside the existing hooks:

```js
useWakeLock(screen === "workout");
```

When `screen` is anything other than `"workout"`, `active` is false and the
effect cleanup releases any held lock.

## Edge behaviors

- **Finish workout** → `screen` becomes `complete` → cleanup releases the lock.
- **Back out to library/select** → same release path.
- **Phone auto-locks / app backgrounded** → OS releases the lock; on return,
  `visibilitychange` re-acquires it while still on the workout screen.
- **Unsupported browser** → feature-detect short-circuits; no errors, screen
  sleeps as normal.

## Testing / verification

No test infrastructure exists in this repo. Verification is manual via the
browser preview workflow:

- Confirm a wake lock is requested when entering the workout screen and released
  when leaving it (finish or back out).
- Confirm no errors are thrown in browsers without the API.

## Out of scope (YAGNI)

- Video-element ("NoSleep") fallback for older iOS.
- Third-party libraries.
- User-facing toggle / setting.
- Any persistence.

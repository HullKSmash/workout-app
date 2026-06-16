import { useState, useEffect, useCallback, useMemo } from "react";
import { WORKOUTS } from "./workouts";
import { VARIANTS, resolveVariant } from "./variants";
import { RIDER_STRENGTH_SCHEDULE } from "./workouts/rider-strength-schedule.js";
import { slotId, loadProgress, saveProgress, clearProgress } from "./workouts/progress.js";
import { getThisWeekCount, saveThisWeekCount } from "./workouts/equestrian-weekly-progress.js";

const variant = resolveVariant();
const isDefaultVariant = variant.audiences === null;
const isEquestrian = variant.audiences?.includes("equestrian") ?? false;
const visibleWorkouts = isDefaultVariant
  ? []
  : WORKOUTS.filter((w) =>
      w.audiences?.some((a) => variant.audiences.includes(a))
    );
const variantLinks = Object.entries(VARIANTS)
  .filter(([, v]) => v.audiences !== null)
  .map(([key, v]) => ({ key, ...v }));

// ─── Modifier defaults ───────────────────────────────────────────────────────
const MODIFIER_DEFAULTS = {
  easier: "Reduce your range of motion or use only body weight",
  harder: "Slow the motion down, increase your range of motion, or add more weight",
};

// ─── Library difficulty config ───────────────────────────────────────────────
const DIFFICULTY_ORDER = { easier: 0, moderate: 1, harder: 2 };
const DIFFICULTY_COLORS = {
  easier: "#22c55e",
  moderate: "#d97706",
  harder: "#ef4444",
};
const DIFFICULTY_LABELS = {
  easier: "Easier",
  moderate: "Moderate",
  harder: "Harder",
};

// ─── Flatten workout into linear step list ──────────────────────────────────
function flattenWorkout(workout) {
  const steps = [];
  const totalPhases = workout.phases.length;

  workout.phases.forEach((phase, phaseIndex) => {
    const phaseSteps = [];
    phase.circuits.forEach((circuit) => {
      for (let round = 0; round < circuit.repeatCount; round++) {
        circuit.exercises.forEach((exercise) => {
          phaseSteps.push({
            ...exercise,
            isRest: exercise.name === "Rest",
            phaseName: phase.name,
            phaseIndex,
            totalPhases,
            round: round + 1,
            totalRounds: circuit.repeatCount,
          });
        });
      }
    });
    phaseSteps.forEach((step, i) => {
      steps.push({
        ...step,
        stepInPhase: i + 1,
        totalStepsInPhase: phaseSteps.length,
      });
    });
  });

  while (steps.length > 0 && steps[steps.length - 1].isRest) steps.pop();

  return steps;
}

// ─── Schedule progress helpers ──────────────────────────────────────────────
const TOTAL_SLOTS = RIDER_STRENGTH_SCHEDULE.weeks.reduce(
  (sum, w) => sum + w.workouts.length,
  0
);

// Count completed slots within a single week.
function weekDoneCount(week, progress) {
  return week.workouts.reduce(
    (n, _, i) => n + (progress[slotId(week.week, i)] ? 1 : 0),
    0
  );
}

// First week that isn't fully complete (where the user "is"). Falls back to the
// last week once everything is done.
function firstIncompleteWeek(progress) {
  const weeks = RIDER_STRENGTH_SCHEDULE.weeks;
  const found = weeks.find((w) => weekDoneCount(w, progress) < w.workouts.length);
  return (found || weeks[weeks.length - 1]).week;
}

// Total completed slots across the whole program.
function totalDoneCount(progress) {
  return RIDER_STRENGTH_SCHEDULE.weeks.reduce(
    (sum, w) => sum + weekDoneCount(w, progress),
    0
  );
}

// ─── Main App ───────────────────────────────────────────────────────────────
export default function WorkoutApp() {
  const [screen, setScreen] = useState(isEquestrian ? "library" : "select"); // library | schedule | select | landing | workout | complete
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null); // schedule slot id for the open workout, or null (e.g. opened from "View all")
  // ─── Library state ───────────────────────────────────────────────────────────
  const ALL_DIFFICULTIES = ["easier", "moderate", "harder"];
  const [activeFilters, setActiveFilters] = useState(new Set(ALL_DIFFICULTIES));
  const [weeklyCount, setWeeklyCount] = useState(() =>
    isEquestrian ? getThisWeekCount() : 0
  );
  const [completed, setCompleted] = useState(loadProgress);
  const [expandedWeek, setExpandedWeek] = useState(() =>
    isEquestrian ? firstIncompleteWeek(loadProgress()) : null
  );
  const [guideOpen, setGuideOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [fadeClass, setFadeClass] = useState("step-enter");
  const [showModifier, setShowModifier] = useState(false);

  const steps = useMemo(
    () => (selectedWorkout ? flattenWorkout(selectedWorkout) : []),
    [selectedWorkout]
  );
  // Filtered + sorted workout list for the library screen.
  const libraryWorkouts = useMemo(() => {
    if (!isEquestrian) return [];
    return visibleWorkouts
      .filter((w) => activeFilters.has(w.difficulty))
      .sort(
        (a, b) =>
          (DIFFICULTY_ORDER[a.difficulty] ?? 99) -
          (DIFFICULTY_ORDER[b.difficulty] ?? 99)
      );
  }, [activeFilters]);

  const WEEK_GOAL = 3;
  // Total dots shown: goal minimum, or actual count if over goal.
  const weeklyDots = Math.max(WEEK_GOAL, weeklyCount);

  const weeklyProgressMessage =
    weeklyCount >= WEEK_GOAL
      ? "Weekly goal hit! Keep going if you feel strong!"
      : weeklyCount === 2
      ? "2 done this week. Shoot for one more!"
      : weeklyCount === 1
      ? "1 done this week. Shoot for 2 more!"
      : null;

  const totalSteps = steps.length;
  const currentExercise = steps[currentStep];

  // Reset timer when landing on a rest step
  useEffect(() => {
    if (screen === "workout" && currentExercise?.isRest) {
      setTimerSeconds(currentExercise.repCount);
    }
  }, [currentStep, screen, currentExercise?.isRest]);

  // Countdown timer for rest
  useEffect(() => {
    if (screen !== "workout" || !currentExercise?.isRest || timerSeconds <= 0)
      return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [screen, currentExercise?.isRest, timerSeconds]);

  // Auto-advance when rest timer reaches 0
  useEffect(() => {
    if (
      screen === "workout" &&
      currentExercise?.isRest &&
      timerSeconds === 0
    ) {
      handleNext();
    }
  }, [timerSeconds]);

  // Collapse modifier panel when exercise changes
  useEffect(() => {
    setShowModifier(false);
  }, [currentStep]);

  const animateTransition = useCallback((callback) => {
    setFadeClass("step-exit");
    setTimeout(() => {
      callback();
      setFadeClass("step-enter");
    }, 200);
  }, []);

  const toggleFilter = (difficulty) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(difficulty)) next.delete(difficulty);
      else next.add(difficulty);
      return next;
    });
  };

  const handleSelectWorkout = (workout, slot = null) => {
    setSelectedWorkout(workout);
    setSelectedSlot(slot);
    setScreen("landing");
  };

  // Toggle a schedule slot's completion and persist immediately.
  const toggleSlot = (slot) => {
    setCompleted((prev) => {
      const next = { ...prev };
      if (next[slot]) delete next[slot];
      else next[slot] = true;
      saveProgress(next);
      return next;
    });
  };

  const handleResetProgress = () => {
    clearProgress();
    setCompleted({});
    setExpandedWeek(isEquestrian ? RIDER_STRENGTH_SCHEDULE.weeks[0].week : null);
  };

  const handleBackFromLanding = () => {
    setScreen(isEquestrian ? "library" : "select");
  };

  const handleStart = () => {
    setCurrentStep(0);
    setScreen("workout");
    setFadeClass("step-enter");
  };

  const handleNext = () => {
    if (currentStep >= totalSteps - 1) {
      // Auto-mark the schedule slot complete on finishing the last step.
      if (selectedSlot && !completed[selectedSlot]) toggleSlot(selectedSlot);
      // Increment weekly count for the library tracker.
      if (isEquestrian) {
        const next = weeklyCount + 1;
        setWeeklyCount(next);
        saveThisWeekCount(next);
      }
      setScreen("complete");
    } else {
      animateTransition(() => setCurrentStep((s) => s + 1));
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      animateTransition(() => setCurrentStep((s) => s - 1));
    }
  };

  const handleEndWorkout = () => {
    setShowEndConfirm(true);
  };

  const confirmEnd = () => {
    setShowEndConfirm(false);
    setScreen(isEquestrian ? "library" : "select");
  };

  const cancelEnd = () => {
    setShowEndConfirm(false);
  };

  const handleBackToStart = () => {
    setScreen(isEquestrian ? "library" : "select");
  };

  // ─── Timer display formatting ───────────────────────────────────────────
  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const restDuration = currentExercise?.isRest ? currentExercise.repCount : 0;
  const timerProgress = restDuration > 0 ? timerSeconds / restDuration : 0;

  // ─── Schedule progress summary (derived) ────────────────────────────────
  const doneTotal = totalDoneCount(completed);
  const currentWeek = firstIncompleteWeek(completed);
  const programComplete = doneTotal >= TOTAL_SLOTS;

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={styles.appContainer}>
      <style>{cssAnimations}</style>

      {/* ── Library ──────────────────────────────────────────────────── */}
      {screen === "library" && (
        <div style={styles.screenContainer}>
          <div style={styles.libraryContent}>
            <h1 style={{ ...styles.appTitle, textAlign: "center" }}>{variant.brandName}</h1>
            <p style={{ ...styles.selectSubtitle, textAlign: "center" }}>{variant.tagline}</p>

            {/* Weekly tracker */}
            <div style={styles.trackerRow}>
              <div style={styles.trackerLabel}>
                This week
                <span style={styles.trackerSubLabel}>Resets Monday</span>
              </div>
              <div style={styles.trackerDots}>
                {Array.from({ length: weeklyDots }).map((_, i) => {
                  const filled = i < weeklyCount;
                  return (
                    <button
                      key={i}
                      aria-label={filled ? "Remove one workout" : "Add one workout"}
                      style={{
                        ...styles.trackerDot,
                        ...(filled ? styles.trackerDotFilled : {}),
                      }}
                      onClick={() => {
                        const next = filled ? weeklyCount - 1 : weeklyCount + 1;
                        setWeeklyCount(next);
                        saveThisWeekCount(next);
                      }}
                    >
                      {filled ? "✓" : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Goal-hit banner */}
            {weeklyCount >= WEEK_GOAL && (
              <div style={styles.goalBanner}>
                <span style={styles.goalBannerIcon}>🌿</span>
                <span style={styles.goalBannerText}>
                  Weekly goal hit! Keep going if you feel strong!
                </span>
              </div>
            )}

            {/* Filter chips */}
            <div style={styles.chipBar}>
              {ALL_DIFFICULTIES.map((d) => {
                const active = activeFilters.has(d);
                return (
                  <button
                    key={d}
                    style={{
                      ...styles.chip,
                      ...(active ? styles.chipActive[d] : styles.chipInactive),
                    }}
                    onClick={() => toggleFilter(d)}
                  >
                    <span
                      style={{
                        ...styles.chipPip,
                        background: active
                          ? DIFFICULTY_COLORS[d]
                          : colors.textSecondary,
                      }}
                    />
                    {DIFFICULTY_LABELS[d]}
                  </button>
                );
              })}
            </div>

            {/* Workout list */}
            <div style={{ ...styles.workoutList, maxWidth: "none" }}>
              {libraryWorkouts.length === 0 ? (
                <p style={styles.libraryEmptyState}>
                  No difficulty selected — tap a filter above to show workouts.
                </p>
              ) : (
                libraryWorkouts.map((workout) => (
                  <button
                    key={workout.name}
                    style={styles.libraryCard}
                    onClick={() => handleSelectWorkout(workout)}
                  >
                    <span
                      style={{
                        ...styles.libraryPip,
                        background: DIFFICULTY_COLORS[workout.difficulty] ?? "#ccc",
                      }}
                    />
                    <span style={styles.libraryCardBody}>
                      <span style={styles.libraryCardName}>{workout.name}</span>
                      <span style={styles.libraryCardDesc}>{workout.description}</span>
                    </span>
                    <span style={styles.libraryCardArrow}>›</span>
                  </button>
                ))
              )}
            </div>

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

            {/* Footer link to 12-week program */}
            <button
              style={styles.viewAllLink}
              onClick={() => setScreen("schedule")}
            >
              Looking for more structure? Follow a 12-week program here!
            </button>
          </div>
        </div>
      )}

      {/* ── Schedule ─────────────────────────────────────────────────── */}
      {screen === "schedule" && (
        <div style={styles.screenContainer}>
          <div style={styles.scheduleContent}>
            <h1 style={styles.appTitle}>{variant.brandName}</h1>
            <p style={styles.selectSubtitle}>{variant.tagline}</p>

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

            {/* Week list */}
            <div style={styles.scheduleSectionLabel}>
              {programComplete
                ? "Program complete"
                : `Week ${currentWeek} of ${RIDER_STRENGTH_SCHEDULE.weeks.length}`}
            </div>
            <div style={styles.weekList}>
              {RIDER_STRENGTH_SCHEDULE.weeks.map(({ week, theme, workouts }) => {
                const isOpen = expandedWeek === week;
                const doneInWeek = weekDoneCount({ week, workouts }, completed);
                const weekFull = doneInWeek === workouts.length;
                return (
                  <div
                    key={week}
                    style={{
                      ...styles.weekCard,
                      ...(weekFull ? styles.weekCardDone : {}),
                      ...(isOpen ? styles.weekCardOpen : {}),
                    }}
                  >
                    <button
                      style={styles.weekHeader}
                      onClick={() => setExpandedWeek(isOpen ? null : week)}
                    >
                      <div>
                        <div style={styles.weekTitle}>Week {week}</div>
                        <div style={styles.weekTheme}>{theme}</div>
                      </div>
                      <div style={styles.weekHeaderRight}>
                        <span
                          style={{
                            ...styles.weekCount,
                            ...(weekFull ? styles.weekCountDone : {}),
                          }}
                        >
                          {weekFull ? "✓ done" : `${doneInWeek}/${workouts.length}`}
                        </span>
                        <span style={styles.weekChevron}>{isOpen ? "∧" : "∨"}</span>
                      </div>
                    </button>
                    {isOpen && (
                      <div style={styles.weekWorkouts}>
                        {workouts.map((workout, i) => {
                          const stepCount = flattenWorkout(workout).length;
                          const id = slotId(week, i);
                          const isDone = !!completed[id];
                          return (
                            <div
                              key={i}
                              style={{
                                ...styles.weekWorkoutRow,
                                ...(i < workouts.length - 1 ? styles.weekWorkoutRowBorder : {}),
                              }}
                            >
                              <button
                                style={{
                                  ...styles.checkCircle,
                                  ...(isDone ? styles.checkCircleDone : {}),
                                }}
                                onClick={() => toggleSlot(id)}
                                aria-label={isDone ? "Mark as not done" : "Mark as done"}
                              >
                                {isDone ? "✓" : ""}
                              </button>
                              <button
                                style={styles.weekWorkoutOpen}
                                onClick={() => handleSelectWorkout(workout, id)}
                              >
                                <div>
                                  <div
                                    style={{
                                      ...styles.weekWorkoutName,
                                      ...(isDone ? styles.weekWorkoutNameDone : {}),
                                    }}
                                  >
                                    {workout.name}
                                  </div>
                                  <div style={styles.weekWorkoutMeta}>
                                    {workout.phases.length} phases · {stepCount} exercises
                                  </div>
                                </div>
                                <span style={styles.weekWorkoutArrow}>›</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* View all workouts link */}
            <button style={styles.viewAllLink} onClick={() => setScreen("select")}>
              View all workouts
            </button>
            <button style={{ ...styles.viewAllLink, marginTop: 0 }} onClick={() => window.location.href = '/'}>
              Choose a different program
            </button>
            {doneTotal > 0 && (
              <button
                style={{ ...styles.viewAllLink, marginTop: 0, color: colors.textSecondary, opacity: 0.7 }}
                onClick={handleResetProgress}
              >
                Reset progress
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Workout Selection ────────────────────────────────────────── */}
      {screen === "select" && (
        <div style={styles.screenContainer}>
          <div style={styles.selectContent}>
            <h1 style={styles.appTitle}>{variant.brandName}</h1>
            <p style={styles.selectSubtitle}>{variant.tagline}</p>
            <div style={styles.workoutList}>
              {isDefaultVariant
                ? variantLinks.map((v) => (
                    <a
                      key={v.key}
                      href={`?variant=${v.key}`}
                      style={{ ...styles.workoutCard, ...styles.variantLink }}
                    >
                      <span style={styles.workoutCardName}>{v.brandName}</span>
                      <span style={styles.workoutCardMeta}>{v.tagline}</span>
                    </a>
                  ))
                : visibleWorkouts.map((workout, i) => {
                    const stepCount = flattenWorkout(workout).length;
                    return (
                      <button
                        key={i}
                        style={styles.workoutCard}
                        onClick={() => handleSelectWorkout(workout)}
                      >
                        <span style={styles.workoutCardName}>{workout.name}</span>
                        <span style={styles.workoutCardMeta}>
                          {stepCount} exercises · {workout.phases.length} phases
                        </span>
                      </button>
                    );
                  })}
            </div>
          </div>
        </div>
      )}

      {/* ── Landing Page ─────────────────────────────────────────────── */}
      {screen === "landing" && selectedWorkout && (
        <div style={styles.screenContainer}>
          <div style={styles.landingContent}>
            {selectedWorkout.difficulty && (
              <div
                style={{
                  ...styles.diffBadge,
                  borderColor: DIFFICULTY_COLORS[selectedWorkout.difficulty],
                  color:
                    selectedWorkout.difficulty === "easier"
                      ? "#166534"
                      : selectedWorkout.difficulty === "moderate"
                      ? "#92400e"
                      : "#7f1d1d",
                  background:
                    selectedWorkout.difficulty === "easier"
                      ? "#f0fdf4"
                      : selectedWorkout.difficulty === "moderate"
                      ? "#fffbeb"
                      : "#fef2f2",
                }}
              >
                <span
                  style={{
                    ...styles.diffBadgePip,
                    background: DIFFICULTY_COLORS[selectedWorkout.difficulty],
                  }}
                />
                {DIFFICULTY_LABELS[selectedWorkout.difficulty]}
              </div>
            )}
            <h1 style={styles.workoutTitle}>{selectedWorkout.name}</h1>
            {selectedWorkout.description && (
              <p style={styles.workoutDescription}>{selectedWorkout.description}</p>
            )}
            <p style={styles.workoutSubtitle}>
              {totalSteps} exercises · {selectedWorkout.phases.length} phases
            </p>
            <button style={styles.startButton} onClick={handleStart}>
              Start Workout
            </button>
            <button
              style={styles.backLink}
              onClick={handleBackFromLanding}
            >
              Choose a different workout
            </button>
          </div>
        </div>
      )}

      {/* ── Workout Page ─────────────────────────────────────────────── */}
      {screen === "workout" && currentExercise && (
        <div style={styles.screenContainer}>
          {/* Segmented progress bar — one segment per phase */}
          <div style={styles.progressBarContainer}>
            {Array.from({ length: currentExercise.totalPhases }).map((_, i) => {
              let fill = 0;
              if (i < currentExercise.phaseIndex) fill = 1;
              else if (i === currentExercise.phaseIndex) {
                fill =
                  currentExercise.stepInPhase /
                  currentExercise.totalStepsInPhase;
              }
              return (
                <div key={i} style={styles.progressBarSegment}>
                  <div
                    style={{
                      ...styles.progressBarFill,
                      width: `${fill * 100}%`,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Phase + in-phase progress text */}
          <div style={styles.progressRow}>
            <span style={styles.phaseLabel}>
              Phase {currentExercise.phaseIndex + 1} of{" "}
              {currentExercise.totalPhases} · {currentExercise.phaseName}
            </span>
            <span style={styles.progressText}>
              {currentExercise.stepInPhase} of{" "}
              {currentExercise.totalStepsInPhase}
            </span>
          </div>

          {/* Exercise content */}
          <div style={{ ...styles.exerciseContent }} className={fadeClass}>
            {currentExercise.isRest ? (
              /* ── Rest Timer ──────────────────────────────────────── */
              <div style={styles.restContainer}>
                <div style={styles.restLabel}>Rest</div>
                <div style={styles.timerRing}>
                  <svg
                    viewBox="0 0 120 120"
                    style={{ width: "100%", height: "100%" }}
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="#E8E4E0"
                      strokeWidth="6"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="#E85D3A"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 54}`}
                      strokeDashoffset={`${2 * Math.PI * 54 * (1 - timerProgress)}`}
                      transform="rotate(-90 60 60)"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>
                  <div style={styles.timerText}>{formatTime(timerSeconds)}</div>
                </div>
                <p style={styles.restHint}>
                  Auto-advancing when timer ends
                </p>
              </div>
            ) : (
              /* ── Exercise Display ────────────────────────────────── */
              <div style={styles.exerciseDisplay}>
                {/* Placeholder image area */}
                <img
                  src="/Gemini_muscle_lady.png"
                  alt="Exercise illustration"
                  style={styles.exerciseImage}
                />

                <h2 style={styles.exerciseName}>{currentExercise.name}</h2>
                <div style={styles.repBadge}>
                  {(() => {
                    const raw = String(currentExercise.repCount);
                    const qualifierMatch = raw.match(/^(.+?)\s+(per side|each side|each arm|each leg)$/i);
                    const number = qualifierMatch ? qualifierMatch[1] : raw;
                    const qualifier = qualifierMatch ? qualifierMatch[2] : null;
                    return (
                      <>
                        <span style={styles.repNumber}>{number}</span>
                        {qualifier && (
                          <span style={styles.repQualifier}>{qualifier}</span>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Circuit / Round info */}
                {currentExercise.totalRounds > 1 && (
                  <div style={styles.roundInfo}>
                    Round {currentExercise.round} of{" "}
                    {currentExercise.totalRounds}
                  </div>
                )}

                {/* Modifier block — fixed space, crossfades between label and panel */}
                <div
                  style={{
                    ...styles.modifierBlock,
                    background: showModifier ? colors.surface : "#F7F5F2",
                  }}
                  onClick={() => setShowModifier((v) => !v)}
                >
                  <div style={{
                    ...styles.modifierToggleLabel,
                    opacity: showModifier ? 0 : 1,
                    pointerEvents: showModifier ? "none" : "auto",
                  }}>
                    <span>Too hard? Too easy?</span>
                    <span style={{ fontSize: 12, marginTop: 3 }}>Tap to see options.</span>
                  </div>
                  <div style={{
                    ...styles.modifierPanel,
                    opacity: showModifier ? 1 : 0,
                    pointerEvents: showModifier ? "auto" : "none",
                  }}>
                    <div style={styles.modifierRow}>
                      <span style={{ ...styles.modifierBadge, ...styles.modifierBadgeEasier }}>
                        Easier
                      </span>
                      <span style={styles.modifierText}>
                        {currentExercise.easier || MODIFIER_DEFAULTS.easier}
                      </span>
                    </div>
                    <div style={{ ...styles.modifierRow, marginTop: 10 }}>
                      <span style={{ ...styles.modifierBadge, ...styles.modifierBadgeHarder }}>
                        Harder
                      </span>
                      <span style={styles.modifierText}>
                        {currentExercise.harder || MODIFIER_DEFAULTS.harder}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons - anchored to bottom */}
          <div style={styles.navContainer}>
            <div style={styles.navRow}>
              {currentStep > 0 ? (
                <button style={styles.navButtonSecondary} onClick={handlePrev}>
                  ← Prev
                </button>
              ) : (
                <div style={{ width: 100 }} />
              )}

              <button style={styles.endButton} onClick={handleEndWorkout}>
                End
              </button>

              <button style={styles.navButtonPrimary} onClick={handleNext}>
                {currentStep >= totalSteps - 1 ? "Finish" : "Next →"}
              </button>
            </div>
          </div>

          {/* End workout confirmation modal */}
          {showEndConfirm && (
            <div style={styles.modalOverlay}>
              <div style={styles.modal}>
                <h3 style={styles.modalTitle}>End Workout?</h3>
                <p style={styles.modalText}>
                  You'll be taken back to the beginning of the workout. Your
                  progress won't be saved.
                </p>
                <div style={styles.modalButtons}>
                  <button style={styles.modalCancel} onClick={cancelEnd}>
                    Keep Going
                  </button>
                  <button style={styles.modalConfirm} onClick={confirmEnd}>
                    End Workout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Completion Page ───────────────────────────────────────────── */}
      {screen === "complete" && (
        <div style={styles.screenContainer}>
          <div style={styles.completeContent}>
            <div style={styles.checkmark}>✓</div>
            <h1 style={styles.completeTitle}>Workout Complete!</h1>
            <p style={styles.completeSubtitle}>
              Great work finishing {selectedWorkout.name}
            </p>

            {isEquestrian && weeklyProgressMessage && (
              <div style={styles.weeklyProgressBlock}>
                <div style={styles.trackerDots}>
                  {Array.from({ length: Math.max(WEEK_GOAL, weeklyCount) }).map(
                    (_, i) => (
                      <div
                        key={i}
                        style={{
                          ...styles.trackerDot,
                          ...(i < weeklyCount ? styles.trackerDotFilled : {}),
                          cursor: "default",
                        }}
                      >
                        {i < weeklyCount ? "✓" : ""}
                      </div>
                    )
                  )}
                </div>
                <p style={styles.weeklyProgressMsg}>{weeklyProgressMessage}</p>
              </div>
            )}

            <button style={styles.startButton} onClick={handleBackToStart}>
              Back to Library
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CSS Animations ─────────────────────────────────────────────────────────
const cssAnimations = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700&family=Outfit:wght@300;400;600;700;800&display=swap');

  .step-enter {
    opacity: 1;
    transform: translateY(0);
    transition: opacity 0.25s ease, transform 0.25s ease;
  }
  .step-exit {
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
`;

// ─── Styles ─────────────────────────────────────────────────────────────────
const colors = {
  bg: "#FAF8F5",
  surface: "#FFFFFF",
  text: "#2D2A26",
  textSecondary: "#8A8279",
  accent: variant.accent,
  accentLight: variant.accentLight,
  border: "#E8E4E0",
  progressBg: "#E8E4E0",
  success: "#3AAE6F",
};

const styles = {
  appContainer: {
    fontFamily: "'DM Sans', sans-serif",
    background: colors.bg,
    minHeight: "100vh",
    color: colors.text,
    WebkitFontSmoothing: "antialiased",
  },

  screenContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    maxWidth: 480,
    margin: "0 auto",
    position: "relative",
  },

  // ── Select ───────────────────────────────────────────────────────
  selectContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
  },

  appTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: colors.accent,
    margin: "0 0 4px 0",
  },

  selectSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: 300,
    margin: "0 0 32px 0",
  },

  workoutList: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: "100%",
    maxWidth: 360,
  },

  workoutCard: {
    fontFamily: "'DM Sans', sans-serif",
    background: colors.surface,
    border: `1.5px solid ${colors.border}`,
    borderRadius: 16,
    padding: "20px 24px",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    transition: "border-color 0.2s, box-shadow 0.2s",
    WebkitTapHighlightColor: "transparent",
  },

  variantLink: {
    textDecoration: "none",
    color: "inherit",
  },

  workoutCardName: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 20,
    fontWeight: 700,
    color: colors.text,
  },

  workoutCardMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: 300,
  },

  // ── Landing ──────────────────────────────────────────────────────
  landingContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    textAlign: "center",
  },

  diffBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    borderRadius: 20,
    border: "1.5px solid",
    fontSize: 12,
    fontWeight: 700,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  diffBadgePip: {
    width: 7,
    height: 7,
    borderRadius: "50%",
  },
  workoutDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 1.5,
    marginBottom: 4,
  },

  workoutTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 36,
    fontWeight: 700,
    margin: "0 0 8px 0",
    letterSpacing: "-0.03em",
    color: colors.text,
  },

  workoutSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    margin: "0 0 48px 0",
    fontWeight: 300,
  },

  startButton: {
    fontFamily: "'DM Sans', sans-serif",
    background: colors.accent,
    color: "#fff",
    border: "none",
    borderRadius: 16,
    padding: "18px 48px",
    fontSize: 18,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.01em",
    transition: "background 0.2s, transform 0.1s",
    WebkitTapHighlightColor: "transparent",
  },

  backLink: {
    fontFamily: "'DM Sans', sans-serif",
    background: "none",
    border: "none",
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    marginTop: 20,
    padding: 8,
    WebkitTapHighlightColor: "transparent",
  },

  // ── Progress ─────────────────────────────────────────────────────
  progressBarContainer: {
    display: "flex",
    gap: 4,
    padding: "0 4px",
    width: "100%",
    flexShrink: 0,
    marginTop: 4,
  },

  progressBarSegment: {
    flex: 1,
    height: 4,
    background: colors.progressBg,
    borderRadius: 2,
    overflow: "hidden",
  },

  progressBarFill: {
    height: "100%",
    background: colors.accent,
    transition: "width 0.4s ease",
  },

  progressRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px 0",
    flexShrink: 0,
  },

  phaseLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.accent,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },

  progressText: {
    fontSize: 12,
    fontWeight: 500,
    color: colors.textSecondary,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginLeft: "auto",
  },

  // ── Exercise Content ─────────────────────────────────────────────
  exerciseContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 24px 0",
  },

  exerciseDisplay: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    width: "100%",
  },

  exerciseImage: {
    width: "100%",
    maxWidth: 320,
    height: 180,
    borderRadius: 16,
    objectFit: "cover",
    marginBottom: 32,
  },

  exerciseName: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 28,
    fontWeight: 700,
    margin: "0 0 20px 0",
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
    color: colors.text,
    maxWidth: 340,
  },

  repBadge: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: colors.accentLight,
    borderRadius: 14,
    padding: "12px 28px",
    marginBottom: 16,
  },

  repNumber: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 40,
    fontWeight: 800,
    color: colors.accent,
    lineHeight: 1,
  },

  repQualifier: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.accent,
    opacity: 0.75,
    marginTop: 4,
    letterSpacing: "0.02em",
  },

  roundInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: 500,
    marginTop: 4,
  },

  // ── Rest Timer ───────────────────────────────────────────────────
  restContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },

  restLabel: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 24,
    fontWeight: 600,
    color: colors.textSecondary,
    marginBottom: 24,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  timerRing: {
    width: 200,
    height: 200,
    position: "relative",
    marginBottom: 20,
  },

  timerText: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    fontFamily: "'Outfit', sans-serif",
    fontSize: 48,
    fontWeight: 700,
    color: colors.text,
  },

  restHint: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: 300,
  },

  // ── Navigation ───────────────────────────────────────────────────
  navContainer: {
    padding: "16px 24px",
    paddingBottom: "max(24px, env(safe-area-inset-bottom))",
    flexShrink: 0,
  },

  navRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  navButtonPrimary: {
    fontFamily: "'DM Sans', sans-serif",
    background: colors.accent,
    color: "#fff",
    border: "none",
    borderRadius: 14,
    padding: "16px 24px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    minWidth: 100,
    transition: "background 0.2s, transform 0.1s",
    WebkitTapHighlightColor: "transparent",
  },

  navButtonSecondary: {
    fontFamily: "'DM Sans', sans-serif",
    background: colors.surface,
    color: colors.text,
    border: `1.5px solid ${colors.border}`,
    borderRadius: 14,
    padding: "16px 24px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    minWidth: 100,
    transition: "background 0.2s, transform 0.1s",
    WebkitTapHighlightColor: "transparent",
  },

  endButton: {
    fontFamily: "'DM Sans', sans-serif",
    background: "transparent",
    color: colors.textSecondary,
    border: "none",
    padding: "16px 12px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  },

  // ── Modal ────────────────────────────────────────────────────────
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(45,42,38,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 24,
  },

  modal: {
    background: colors.surface,
    borderRadius: 20,
    padding: 32,
    maxWidth: 340,
    width: "100%",
    textAlign: "center",
  },

  modalTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    margin: "0 0 8px 0",
    color: colors.text,
  },

  modalText: {
    fontSize: 15,
    color: colors.textSecondary,
    margin: "0 0 28px 0",
    lineHeight: 1.5,
    fontWeight: 300,
  },

  modalButtons: {
    display: "flex",
    gap: 12,
  },

  modalCancel: {
    fontFamily: "'DM Sans', sans-serif",
    flex: 1,
    background: colors.surface,
    color: colors.text,
    border: `1.5px solid ${colors.border}`,
    borderRadius: 14,
    padding: "14px 16px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  },

  modalConfirm: {
    fontFamily: "'DM Sans', sans-serif",
    flex: 1,
    background: colors.accent,
    color: "#fff",
    border: "none",
    borderRadius: 14,
    padding: "14px 16px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  },

  // ── Modifier Panel ───────────────────────────────────────────
  modifierBlock: {
    width: "100%",
    maxWidth: 320,
    minHeight: 108,
    position: "relative",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    borderRadius: 12,
    border: `1.5px solid ${colors.border}`,
    marginTop: 4,
    transition: "background 0.15s ease",
  },

  modifierToggleLabel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 500,
    color: colors.textSecondary,
    transition: "opacity 0.15s ease",
  },

  modifierPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    justifyContent: "center",
    borderRadius: 12,
    transition: "opacity 0.15s ease",
  },

  modifierRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
  },

  modifierBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 20,
    flexShrink: 0,
    whiteSpace: "nowrap",
    marginTop: 1,
  },

  modifierBadgeEasier: {
    background: "#EAF1FC",
    color: "#2D6BD1",
  },

  modifierBadgeHarder: {
    background: "#FFF0EC",
    color: "#E85D3A",
  },

  modifierText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 1.5,
    textAlign: "left",
  },

  libraryContent: {
    width: "100%",
    maxWidth: 480,
    margin: "0 auto",
    padding: "20px 16px 40px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  libraryCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    background: colors.surface,
    border: "none",
    borderRadius: 12,
    padding: "12px 14px",
    cursor: "pointer",
    textAlign: "left",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
    width: "100%",
  },
  libraryPip: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 4,
  },
  libraryCardBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  libraryCardName: {
    fontSize: 15,
    fontWeight: 700,
    color: colors.text,
  },
  libraryCardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 1.4,
  },
  libraryCardArrow: {
    fontSize: 20,
    color: colors.border,
    fontWeight: 300,
    alignSelf: "center",
  },
  trackerRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: colors.surface,
    borderRadius: 12,
    padding: "12px 14px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  },
  trackerLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: 700,
    color: colors.text,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  trackerSubLabel: {
    fontSize: 11,
    fontWeight: 400,
    color: colors.textSecondary,
  },
  trackerDots: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  trackerDot: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    border: `2px solid ${colors.border}`,
    background: colors.surface,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "transparent",
    cursor: "pointer",
    padding: 0,
  },
  trackerDotFilled: {
    background: colors.accent,
    borderColor: colors.accent,
    color: "#fff",
  },
  goalBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    padding: "10px 14px",
  },
  goalBannerIcon: {
    fontSize: 16,
  },
  goalBannerText: {
    fontSize: 13,
    fontWeight: 600,
    color: "#166534",
  },
  chipBar: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    border: "1.5px solid",
    letterSpacing: 0.2,
  },
  chipActive: {
    easier: {
      borderColor: "#22c55e",
      color: "#166534",
      background: "#f0fdf4",
    },
    moderate: {
      borderColor: "#d97706",
      color: "#92400e",
      background: "#fffbeb",
    },
    harder: {
      borderColor: "#ef4444",
      color: "#7f1d1d",
      background: "#fef2f2",
    },
  },
  chipInactive: {
    borderColor: colors.border,
    color: colors.textSecondary,
    background: colors.surface,
  },
  chipPip: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    flexShrink: 0,
  },
  libraryEmptyState: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    padding: "24px 0",
  },

  // ── Schedule ─────────────────────────────────────────────────────
  scheduleContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px 24px 32px",
    width: "100%",
    boxSizing: "border-box",
  },

  guideCard: {
    width: "100%",
    maxWidth: 400,
    background: colors.accentLight,
    borderRadius: 16,
    marginBottom: 28,
    overflow: "hidden",
  },

  guideToggle: {
    fontFamily: "'DM Sans', sans-serif",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    background: "none",
    border: "none",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    textAlign: "left",
  },

  guideToggleLeft: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },

  guideIcon: {
    fontSize: 18,
    lineHeight: 1,
    marginTop: 2,
    flexShrink: 0,
  },

  guideTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 16,
    fontWeight: 700,
    color: colors.accent,
    textAlign: "left",
  },

  guideSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: 400,
    marginTop: 2,
    textAlign: "left",
  },

  guideChevron: {
    fontSize: 14,
    color: colors.textSecondary,
    flexShrink: 0,
    marginLeft: 8,
  },

  guideBody: {
    padding: "0 20px 16px",
  },

  guidePlaceholder: {
    fontSize: 14,
    color: colors.textSecondary,
    margin: 0,
    fontStyle: "italic",
  },

  scheduleSectionLabel: {
    width: "100%",
    maxWidth: 400,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  weekList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: "100%",
    maxWidth: 400,
  },

  weekHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },

  weekCount: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.textSecondary,
    fontVariantNumeric: "tabular-nums",
  },

  weekCountDone: {
    color: colors.success,
  },

  weekCard: {
    background: colors.surface,
    border: `1.5px solid ${colors.border}`,
    borderRadius: 16,
    overflow: "hidden",
  },

  weekCardOpen: {
    border: `1.5px solid ${colors.accent}`,
  },

  weekCardDone: {
    background: colors.bg,
    borderColor: colors.border,
    opacity: 0.62,
  },

  weekHeader: {
    fontFamily: "'DM Sans', sans-serif",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    background: "none",
    border: "none",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    textAlign: "left",
  },

  weekTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 20,
    fontWeight: 700,
    color: colors.text,
    lineHeight: 1.2,
  },

  weekTheme: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: 400,
    marginTop: 2,
  },

  weekChevron: {
    fontSize: 14,
    color: colors.textSecondary,
    flexShrink: 0,
  },

  weekWorkouts: {
    borderTop: `1px solid ${colors.border}`,
  },

  weekWorkoutRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    paddingLeft: 16,
  },

  weekWorkoutRowBorder: {
    borderBottom: `1px solid ${colors.border}`,
  },

  checkCircle: {
    flexShrink: 0,
    width: 24,
    height: 24,
    borderRadius: "50%",
    border: `2px solid ${colors.border}`,
    background: colors.surface,
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    WebkitTapHighlightColor: "transparent",
  },

  checkCircleDone: {
    background: colors.success,
    border: `2px solid ${colors.success}`,
  },

  weekWorkoutOpen: {
    fontFamily: "'DM Sans', sans-serif",
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px 14px 12px",
    background: "none",
    border: "none",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    textAlign: "left",
  },

  weekWorkoutName: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 16,
    fontWeight: 700,
    color: colors.text,
  },

  weekWorkoutNameDone: {
    color: colors.textSecondary,
    textDecoration: "line-through",
  },

  weekWorkoutMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: 400,
    marginTop: 2,
  },

  weekWorkoutArrow: {
    fontSize: 18,
    color: colors.textSecondary,
    flexShrink: 0,
    marginLeft: 8,
  },

  viewAllLink: {
    fontFamily: "'DM Sans', sans-serif",
    background: "none",
    border: "none",
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    marginTop: 24,
    padding: 8,
    WebkitTapHighlightColor: "transparent",
  },

  // ── Complete ─────────────────────────────────────────────────────
  weeklyProgressBlock: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  weeklyProgressMsg: {
    fontSize: 13,
    fontWeight: 600,
    color: "#166534",
    textAlign: "center",
    lineHeight: 1.4,
  },
  completeContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    textAlign: "center",
  },

  checkmark: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: "#E8F8EE",
    color: colors.success,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 40,
    fontWeight: 700,
    marginBottom: 28,
  },

  completeTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 32,
    fontWeight: 700,
    margin: "0 0 8px 0",
    letterSpacing: "-0.02em",
    color: colors.text,
  },

  completeSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    margin: "0 0 48px 0",
    fontWeight: 300,
  },
};

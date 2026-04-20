import { useState, useEffect, useCallback, useMemo } from "react";
import { WORKOUTS, REST_DURATION } from "./workout-data";

// ─── Flatten workout into linear step list ──────────────────────────────────
function flattenWorkout(workout) {
  const steps = [];
  workout.circuits.forEach((circuit, circuitIndex) => {
    for (let round = 0; round < circuit.repeatCount; round++) {
      circuit.exercises.forEach((exercise, exerciseIndex) => {
        steps.push({
          ...exercise,
          isRest: exercise.name === "Rest",
          phase: circuit.phase,
          circuitIndex,
          round: round + 1,
          totalRounds: circuit.repeatCount,
          exerciseIndex,
          totalExercisesInCircuit: circuit.exercises.length,
        });
      });
    }
  });
  return steps;
}

// ─── Main App ───────────────────────────────────────────────────────────────
export default function WorkoutApp() {
  const [screen, setScreen] = useState("select"); // select | landing | workout | complete
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(REST_DURATION);
  const [fadeClass, setFadeClass] = useState("step-enter");

  const steps = useMemo(
    () => (selectedWorkout ? flattenWorkout(selectedWorkout) : []),
    [selectedWorkout]
  );
  const totalSteps = steps.length;
  const currentExercise = steps[currentStep];

  // Reset timer when landing on a rest step
  useEffect(() => {
    if (screen === "workout" && currentExercise?.isRest) {
      setTimerSeconds(REST_DURATION);
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

  const animateTransition = useCallback((callback) => {
    setFadeClass("step-exit");
    setTimeout(() => {
      callback();
      setFadeClass("step-enter");
    }, 200);
  }, []);

  const handleSelectWorkout = (workout) => {
    setSelectedWorkout(workout);
    setScreen("landing");
  };

  const handleStart = () => {
    setCurrentStep(0);
    setScreen("workout");
    setFadeClass("step-enter");
  };

  const handleNext = () => {
    if (currentStep >= totalSteps - 1) {
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
    setScreen("select");
  };

  const cancelEnd = () => {
    setShowEndConfirm(false);
  };

  const handleBackToStart = () => {
    setScreen("select");
  };

  // ─── Timer display formatting ───────────────────────────────────────────
  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const timerProgress = timerSeconds / REST_DURATION;

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={styles.appContainer}>
      <style>{cssAnimations}</style>

      {/* ── Workout Selection ────────────────────────────────────────── */}
      {screen === "select" && (
        <div style={styles.screenContainer}>
          <div style={styles.selectContent}>
            <h1 style={styles.selectTitle}>Choose a Workout</h1>
            <div style={styles.workoutList}>
              {WORKOUTS.map((workout, i) => {
                const stepCount = flattenWorkout(workout).length;
                return (
                  <button
                    key={i}
                    style={styles.workoutCard}
                    onClick={() => handleSelectWorkout(workout)}
                  >
                    <span style={styles.workoutCardName}>{workout.name}</span>
                    <span style={styles.workoutCardMeta}>
                      {stepCount} exercises · {workout.circuits.length} circuits
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
            <h1 style={styles.workoutTitle}>{selectedWorkout.name}</h1>
            <p style={styles.workoutSubtitle}>
              {totalSteps} exercises · {selectedWorkout.circuits.length} circuits
            </p>
            <button style={styles.startButton} onClick={handleStart}>
              Start Workout
            </button>
            <button
              style={styles.backLink}
              onClick={() => setScreen("select")}
            >
              Choose a different workout
            </button>
          </div>
        </div>
      )}

      {/* ── Workout Page ─────────────────────────────────────────────── */}
      {screen === "workout" && currentExercise && (
        <div style={styles.screenContainer}>
          {/* Progress bar */}
          <div style={styles.progressBarContainer}>
            <div
              style={{
                ...styles.progressBarFill,
                width: `${((currentStep + 1) / totalSteps) * 100}%`,
              }}
            />
          </div>

          {/* Phase + progress text */}
          <div style={styles.progressRow}>
            {currentExercise.phase && (
              <span style={styles.phaseLabel}>{currentExercise.phase}</span>
            )}
            <span style={styles.progressText}>
              {currentStep + 1} of {totalSteps}
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
                  <span style={styles.repNumber}>
                    {currentExercise.repCount}
                  </span>
                  <span style={styles.repLabel}>reps</span>
                </div>

                {/* Circuit / Round info */}
                {currentExercise.totalRounds > 1 && (
                  <div style={styles.roundInfo}>
                    Round {currentExercise.round} of{" "}
                    {currentExercise.totalRounds}
                  </div>
                )}
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
            <button style={styles.startButton} onClick={handleBackToStart}>
              Back to Start
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
  accent: "#E85D3A",
  accentHover: "#D14E2D",
  accentLight: "#FFF0EC",
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

  selectTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: colors.text,
    marginBottom: 32,
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
    height: 4,
    background: colors.progressBg,
    width: "100%",
    flexShrink: 0,
  },

  progressBarFill: {
    height: "100%",
    background: colors.accent,
    borderRadius: "0 4px 4px 0",
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
    alignItems: "baseline",
    gap: 6,
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

  repLabel: {
    fontSize: 16,
    fontWeight: 500,
    color: colors.accent,
    opacity: 0.8,
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

  // ── Complete ─────────────────────────────────────────────────────
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

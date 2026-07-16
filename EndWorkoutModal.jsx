// Shared "End Workout?" confirmation, used by BOTH the step-through and the
// checklist views so the two are always identical in look and copy. Purely
// presentational: the caller owns visibility and supplies the handlers.
// `accent` is the only per-variant value; the rest of the palette is constant.

const TEXT = "#2D2A26";
const TEXT_SECONDARY = "#8A8279";
const SURFACE = "#FFFFFF";
const BORDER = "#E8E4E0";

export default function EndWorkoutModal({ accent, onCancel, onConfirm }) {
  const s = makeStyles(accent);
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <h3 style={s.title}>End Workout?</h3>
        <p style={s.text}>
          You'll leave this workout and your progress won't be saved.
        </p>
        <div style={s.buttons}>
          <button style={s.cancel} onClick={onCancel}>
            Keep Going
          </button>
          <button style={s.confirm} onClick={onConfirm}>
            End Workout
          </button>
        </div>
      </div>
    </div>
  );
}

function makeStyles(accent) {
  return {
    overlay: {
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
      background: SURFACE,
      borderRadius: 20,
      padding: 32,
      maxWidth: 340,
      width: "100%",
      textAlign: "center",
    },
    title: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 22,
      fontWeight: 700,
      margin: "0 0 8px 0",
      color: TEXT,
    },
    text: {
      fontSize: 15,
      color: TEXT_SECONDARY,
      margin: "0 0 28px 0",
      lineHeight: 1.5,
      fontWeight: 300,
    },
    buttons: { display: "flex", gap: 12 },
    cancel: {
      fontFamily: "'DM Sans', sans-serif",
      flex: 1,
      background: SURFACE,
      color: TEXT,
      border: `1.5px solid ${BORDER}`,
      borderRadius: 14,
      padding: "14px 16px",
      fontSize: 15,
      fontWeight: 600,
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    },
    confirm: {
      fontFamily: "'DM Sans', sans-serif",
      flex: 1,
      background: accent,
      color: "#fff",
      border: "none",
      borderRadius: 14,
      padding: "14px 16px",
      fontSize: 15,
      fontWeight: 600,
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    },
  };
}

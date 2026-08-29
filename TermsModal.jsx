// First-run Terms & Conditions consent modal. A blocking overlay shown over the
// main page until the user checks the box and clicks "I Agree". Presentational:
// the parent owns persistence and decides when to render it. No close/dismiss —
// consent is required. Styling mirrors GateScreen (accent-driven inline styles).
import { useState } from "react";

const TEXT = "#2D2A26";
const TEXT_SECONDARY = "#8A8279";

export default function TermsModal({ accent, accentLight, onAgree }) {
  const s = makeStyles(accent, accentLight);
  const [checked, setChecked] = useState(false);

  return (
    <div
      style={s.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Terms and Conditions and Cookie Policy"
    >
      <div style={s.card}>
        <h2 style={s.title}>Before you begin</h2>
        <p style={s.body}>
          Please review our Terms &amp; Conditions and Cookie Policy, including
          the liability waiver. You must agree to continue.
        </p>
        <a style={s.link} href="/terms.html" target="_blank" rel="noopener">
          Read the full Terms &amp; Conditions →
        </a>
        <a style={s.link} href="/cookiePolicy.html" target="_blank" rel="noopener">
          Read the full Cookie Policy →
        </a>
        <label style={s.checkboxRow}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={s.checkbox}
            aria-label="I have read and agree to the Terms and Conditions and Cookie Policy"
          />
          <span style={s.checkboxLabel}>
            I have read and agree to the Terms &amp; Conditions and Cookie
            Policy.
          </span>
        </label>
        <button
          style={{ ...s.button, ...(checked ? {} : s.buttonDisabled) }}
          type="button"
          disabled={!checked}
          onClick={onAgree}
        >
          I Agree
        </button>
      </div>
    </div>
  );
}

function makeStyles(accent, accentLight) {
  return {
    backdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(45, 42, 38, 0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      boxSizing: "border-box",
      zIndex: 1000,
      fontFamily: "'DM Sans', sans-serif",
    },
    card: {
      background: "#FAF8F5",
      borderRadius: 16,
      padding: "24px",
      width: "100%",
      maxWidth: 400,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 14,
      boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
    },
    title: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 24,
      fontWeight: 800,
      letterSpacing: "-0.02em",
      color: accent,
      margin: 0,
    },
    body: {
      fontSize: 15,
      lineHeight: 1.6,
      color: TEXT_SECONDARY,
      margin: 0,
    },
    link: {
      fontSize: 15,
      fontWeight: 700,
      color: accent,
      textDecoration: "none",
    },
    checkboxRow: {
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      cursor: "pointer",
    },
    checkbox: {
      width: 20,
      height: 20,
      marginTop: 1,
      accentColor: accent,
      flexShrink: 0,
    },
    checkboxLabel: {
      fontSize: 15,
      lineHeight: 1.5,
      color: TEXT,
    },
    button: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 17,
      fontWeight: 700,
      padding: "14px 16px",
      borderRadius: 12,
      border: "none",
      color: "#fff",
      background: accent,
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    },
    buttonDisabled: {
      background: accentLight,
      cursor: "not-allowed",
    },
  };
}

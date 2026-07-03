// Invite-only soft gate. Shown before the app whenever no access code is stored
// locally. On submit it asks the server (/api/unlock) whether the code is on the
// allowlist; a valid code is persisted by the caller and unlocks the app.
import { useState } from "react";
import { requestUnlock } from "./access";

const TEXT = "#2D2A26";
const TEXT_SECONDARY = "#8A8279";
const BG = "#FAF8F5";

export default function GateScreen({ brandName, accent, accentLight, onUnlock }) {
  const s = makeStyles(accent, accentLight);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | checking | invalid | error
  const disabled = status === "checking" || code.trim() === "";

  const submit = async (e) => {
    e.preventDefault();
    if (disabled) return;
    setStatus("checking");
    try {
      const { ok, code: normalized } = await requestUnlock(code);
      if (ok) {
        onUnlock(normalized);
      } else {
        setStatus("invalid");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div style={s.screen}>
      <form style={s.content} onSubmit={submit}>
        <h1 style={s.title}>{brandName}</h1>
        <p style={s.subtitle}>Enter your access code to continue.</p>
        <input
          style={s.input}
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          placeholder="Access code"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          aria-label="Access code"
        />
        <button style={s.button} type="submit" disabled={disabled}>
          {status === "checking" ? "Checking…" : "Enter"}
        </button>
        {status === "invalid" && (
          <p style={s.error}>That code isn't valid. Double-check and try again.</p>
        )}
        {status === "error" && (
          <p style={s.error}>Couldn't check that right now. Please try again.</p>
        )}
      </form>
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
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      padding: "24px",
      width: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    },
    title: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 32,
      fontWeight: 800,
      letterSpacing: "-0.02em",
      color: accent,
      margin: 0,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 1.6,
      color: TEXT_SECONDARY,
      margin: "0 0 4px 0",
      textAlign: "center",
    },
    input: {
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 17,
      padding: "14px 16px",
      borderRadius: 12,
      border: `2px solid ${accentLight}`,
      color: TEXT,
      background: "#fff",
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
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
    error: {
      fontSize: 14,
      color: "#B4342B",
      margin: 0,
      textAlign: "center",
    },
  };
}

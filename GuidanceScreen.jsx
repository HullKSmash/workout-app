import { useState } from "react";
import { HOW_TO } from "./guidance";

// Dedicated, scrollable "Guidance & Tips" reading screen. Pure presentational:
// given variant guidance content + accent colors + an onBack handler, it renders
// the section tree. Kept out of workout-app.jsx so that file doesn't grow another
// full screen; the content itself lives in guidance.js.

const TEXT = "#2D2A26";
const TEXT_SECONDARY = "#8A8279";
const BG = "#FAF8F5";

function Section({ section, nested, accent, accentLight }) {
  const s = makeStyles(accent, accentLight);
  const Heading = nested ? "h3" : "h2";
  return (
    <div style={nested ? s.subSection : s.section}>
      <Heading style={nested ? s.subHeading : s.heading}>{section.title}</Heading>
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

function StepGroup({ group, accent, accentLight }) {
  const s = makeStyles(accent, accentLight);
  return (
    <div style={s.stepGroup}>
      <div style={s.stepGroupLabel}>{group.label}</div>
      <ol style={s.stepList}>
        {group.steps.map((step, i) => (
          <li key={i} style={s.step}>
            <span>{step.text}</span>
            {step.image && (
              <img
                src={step.image.src}
                alt={step.image.alt}
                loading="lazy"
                style={s.stepImage}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function CollapsibleSection({ section, accent, accentLight }) {
  const s = makeStyles(accent, accentLight);
  const [open, setOpen] = useState(false);
  return (
    <div style={s.collapsible}>
      <button
        style={s.collapsibleHeader}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span style={s.collapsibleTitle}>{section.title}</span>
        <span
          style={{
            ...s.chevron,
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
          aria-hidden="true"
        >
          {"›"}
        </span>
      </button>
      {open && (
        <div style={s.collapsibleBody}>
          {(section.body ?? []).map((para, i) => (
            <p key={i} style={s.para}>
              {para}
            </p>
          ))}
          {(section.stepGroups ?? []).map((group, i) => (
            <StepGroup
              key={i}
              group={group}
              accent={accent}
              accentLight={accentLight}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GuidanceScreen({ guidance, accent, accentLight, onBack }) {
  const s = makeStyles(accent, accentLight);
  return (
    <div style={s.screen}>
      <div style={s.content}>
        <button style={s.backButton} onClick={onBack} aria-label="Back">
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
        {HOW_TO.map((section, i) => (
          <CollapsibleSection
            key={`howto-${i}`}
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
    collapsible: {
      borderTop: `0.5px solid ${accentLight}`,
    },
    collapsibleHeader: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      background: "none",
      border: "none",
      padding: "16px 0",
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "'DM Sans', sans-serif",
      WebkitTapHighlightColor: "transparent",
    },
    collapsibleTitle: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 18,
      fontWeight: 700,
      color: TEXT,
    },
    chevron: {
      fontSize: 22,
      lineHeight: 1,
      color: accent,
      transition: "transform 0.15s ease",
    },
    collapsibleBody: {
      paddingBottom: 12,
    },
    stepGroup: {
      marginTop: 12,
    },
    stepGroupLabel: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 15,
      fontWeight: 700,
      color: accent,
      margin: "0 0 8px 0",
    },
    stepList: {
      margin: 0,
      paddingLeft: 20,
    },
    step: {
      fontSize: 15,
      lineHeight: 1.6,
      color: TEXT,
      marginBottom: 16,
    },
    stepImage: {
      display: "block",
      maxWidth: "100%",
      marginTop: 10,
      borderRadius: 12,
      border: `0.5px solid ${accentLight}`,
    },
  };
}

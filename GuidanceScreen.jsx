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

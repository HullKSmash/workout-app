// Checklist workout view — an alternative to the step-through. Renders the whole
// workout as set-grouped rounds, each round-exercise with its own checkbox that
// can be ticked in any order. Presentational: ticked state, persistence, and
// completion live in the container (workout-app.jsx). This component owns only
// view state — the expanded set, the open detail sheet, and the leave modal.
import { useEffect, useRef, useState } from "react";
import EndWorkoutModal from "./EndWorkoutModal";
import { resolveExercise, formatExerciseTitle } from "./workouts/exercises.js";

const TEXT = "#2D2A26";
const TEXT_SECONDARY = "#8A8279";
const BG = "#FAF8F5";
const SURFACE = "#FFFFFF";
const BORDER = "#E8E4E0";
const SUCCESS = "#3AAE6F";
const TIPS_DEFAULT =
  "If this is too easy, check your form, slow down, increase your range of motion, and add weight if necessary. If it's too hard, decrease the weight, decrease the number of reps, and reduce your range of motion if necessary.";

function setItemCount(set) {
  let n = 0;
  for (const g of set.groups) for (const r of g.rounds) n += r.items.length;
  return n;
}
function setDoneCount(set, checked) {
  let n = 0;
  for (const g of set.groups)
    for (const r of g.rounds)
      for (const it of r.items) if (checked.has(it.id)) n += 1;
  return n;
}
function setComplete(set, checked) {
  const total = setItemCount(set);
  return total > 0 && setDoneCount(set, checked) === total;
}

export default function ChecklistScreen({
  workout,
  checklist,
  checked,
  onToggle,
  onFinish,
  onLeave,
  accent,
  accentLight,
}) {
  const s = makeStyles(accent, accentLight);
  const { sets, totalItems } = checklist;

  const doneCount = sets.reduce((n, set) => n + setDoneCount(set, checked), 0);
  const allDone = totalItems > 0 && doneCount === totalItems;

  // Current set = first set (in order) that still has an unchecked item.
  const currentSetId = sets.find((set) => !setComplete(set, checked))?.id ?? null;

  const [expandedSetId, setExpandedSetId] = useState(
    currentSetId ?? (sets[0] && sets[0].id) ?? null
  );
  const [detailItem, setDetailItem] = useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // When the set the user is working in (the expanded one) becomes complete,
  // collapse it and open the next incomplete set BELOW it — regardless of whether
  // an earlier set was skipped. If there's no incomplete set below (e.g. they
  // skipped an earlier set and just finished the last one), collapse without
  // jumping; the current-set highlight already points at what's left.
  //
  // We detect a genuine incomplete→complete transition of the *same* expanded
  // set, so manually opening an already-completed set to review/un-tick it never
  // triggers an advance.
  const prevExpandedRef = useRef({ id: null, complete: false });
  useEffect(() => {
    const idx = sets.findIndex((set) => set.id === expandedSetId);
    const expanded = idx === -1 ? null : sets[idx];
    const complete = expanded ? setComplete(expanded, checked) : false;
    const prev = prevExpandedRef.current;
    if (complete && prev.id === expandedSetId && !prev.complete) {
      const nextIncomplete = sets
        .slice(idx + 1)
        .find((set) => !setComplete(set, checked));
      setExpandedSetId(nextIncomplete ? nextIncomplete.id : null);
    }
    prevExpandedRef.current = { id: expandedSetId, complete };
  }, [checked, expandedSetId, sets]);

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <div style={s.title}>{workout.name}</div>
        <div style={s.bar}>
          {sets.map((set) => {
            const c = setItemCount(set);
            const fill = c > 0 ? setDoneCount(set, checked) / c : 0;
            return (
              <div key={set.id} style={s.barSeg}>
                <div style={{ ...s.barFill, width: `${fill * 100}%` }} />
              </div>
            );
          })}
        </div>
        <div style={{ ...s.count, ...(allDone ? s.countDone : {}) }}>
          {allDone
            ? `${totalItems} of ${totalItems} done 🎉`
            : `${doneCount} of ${totalItems} done`}
        </div>
      </div>

      {allDone && (
        <div style={s.completeBanner}>
          <div style={s.bigCheck}>✓</div>
          <div style={s.completeTitle}>Every set complete</div>
          <div style={s.completeSub}>Nice work — tap Finish to log it.</div>
        </div>
      )}

      <div style={s.list}>
        {sets.map((set) => {
          const complete = setComplete(set, checked);
          const isOpen = expandedSetId === set.id;
          const isCurrent = currentSetId === set.id;
          const c = setItemCount(set);
          const done = setDoneCount(set, checked);
          return (
            <div
              key={set.id}
              style={{
                ...s.set,
                ...(isCurrent ? s.setCurrent : {}),
                ...(complete ? s.setDone : {}),
              }}
            >
              <button
                style={s.setHeader}
                onClick={() => setExpandedSetId(isOpen ? null : set.id)}
              >
                <span style={s.setName}>
                  {complete ? "✓ " : isCurrent ? "● " : ""}
                  {set.name}
                </span>
                <span style={complete ? s.doneFlag : s.setMeta}>
                  {complete ? "done" : `${done} of ${c}`}
                </span>
              </button>

              {isOpen && (
                <div style={s.setBody}>
                  {set.groups.map((group, gi) => (
                    <div key={group.id}>
                      {set.multiCircuit && (
                        <div style={s.circuitLabel}>Circuit {gi + 1}</div>
                      )}
                      {group.rounds.map((round) => (
                        <div key={round.round}>
                          {group.multiRound && (
                            <div style={s.roundLabel}>Round {round.round}</div>
                          )}
                          {round.items.map((item) => {
                            const on = checked.has(item.id);
                            return (
                              <div key={item.id} style={s.row}>
                                <button
                                  style={{ ...s.box, ...(on ? s.boxOn : {}) }}
                                  onClick={() => onToggle(item.id)}
                                  aria-label={on ? "Uncheck exercise" : "Check exercise"}
                                >
                                  {on ? "✓" : ""}
                                </button>
                                <span
                                  style={{ ...s.rowName, ...(on ? s.rowNameOn : {}) }}
                                >
                                  {formatExerciseTitle(item)}
                                  <span style={s.rowReps}> · {item.repCount}</span>
                                </span>
                                <button
                                  style={s.info}
                                  onClick={() => setDetailItem(item)}
                                  aria-label={`How to do ${item.name}`}
                                >
                                  ⓘ
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                  {set.restCaption && <div style={s.rest}>{set.restCaption}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={s.footer}>
        {allDone ? (
          <button style={s.finishBtn} onClick={onFinish}>
            Finish
          </button>
        ) : (
          <button style={s.leaveBtn} onClick={() => setShowLeaveConfirm(true)}>
            End workout
          </button>
        )}
      </div>

      {detailItem && (
        <div style={s.scrim} onClick={() => setDetailItem(null)}>
          <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
            {(() => {
              const media = resolveExercise(detailItem);
              return (
                <>
                  {media.videoSrc ? (
                    <video
                      src={media.videoSrc}
                      style={{ ...s.sheetMedia, objectFit: "cover", transform: media.mirror ? "scaleX(-1)" : undefined }}
                      aria-label={formatExerciseTitle(detailItem)}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <div style={s.sheetMedia}>▶ demo coming soon</div>
                  )}
                  <div style={s.sheetName}>{formatExerciseTitle(detailItem)}</div>
                  <div style={s.sheetReps}>{detailItem.repCount}</div>
                  <div style={s.tipBox}>
                    <span style={s.tipIcon}>ℹ️</span>
                    <span style={s.tipText}>{media.tips || TIPS_DEFAULT}</span>
                  </div>
                </>
              );
            })()}
            <button style={s.sheetClose} onClick={() => setDetailItem(null)}>
              Got it
            </button>
          </div>
        </div>
      )}

      {showLeaveConfirm && (
        <EndWorkoutModal
          accent={accent}
          onCancel={() => setShowLeaveConfirm(false)}
          onConfirm={onLeave}
        />
      )}
    </div>
  );
}

function makeStyles(accent, accentLight) {
  return {
    screen: {
      fontFamily: "'DM Sans', sans-serif",
      minHeight: "100vh",
      maxWidth: 480,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      background: BG,
      color: TEXT,
    },
    header: { flexShrink: 0, padding: "18px 16px 8px" },
    title: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 20,
      fontWeight: 800,
      letterSpacing: "-0.02em",
      textAlign: "center",
    },
    bar: { display: "flex", gap: 3, margin: "10px 4px 6px" },
    barSeg: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      background: BORDER,
      overflow: "hidden",
    },
    barFill: { height: "100%", background: accent, transition: "width 0.3s ease" },
    count: {
      fontSize: 12,
      fontWeight: 600,
      color: TEXT_SECONDARY,
      textAlign: "center",
    },
    countDone: { color: SUCCESS, fontWeight: 800 },

    completeBanner: {
      flexShrink: 0,
      textAlign: "center",
      padding: "6px 16px 10px",
    },
    bigCheck: {
      width: 56,
      height: 56,
      borderRadius: "50%",
      background: "#E8F8EE",
      color: SUCCESS,
      fontSize: 28,
      fontWeight: 800,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 8px",
    },
    completeTitle: { fontSize: 15, fontWeight: 700 },
    completeSub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },

    list: { flex: 1, overflowY: "auto", padding: "4px 16px 8px" },
    set: {
      background: SURFACE,
      border: `1.5px solid ${BORDER}`,
      borderRadius: 14,
      padding: "2px 4px",
      marginBottom: 9,
    },
    setCurrent: {
      border: `1.5px solid ${accent}`,
      boxShadow: `0 0 0 3px ${accentLight}`,
    },
    setDone: { background: "#f4f1ee", opacity: 0.72 },
    setHeader: {
      fontFamily: "'DM Sans', sans-serif",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 10px",
      background: "none",
      border: "none",
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    },
    setName: {
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: accent,
      textAlign: "left",
    },
    setMeta: { fontSize: 11, fontWeight: 600, color: TEXT_SECONDARY },
    doneFlag: { fontSize: 11, fontWeight: 700, color: SUCCESS },
    setBody: { padding: "2px 10px 10px" },
    circuitLabel: {
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: "0.06em",
      color: TEXT_SECONDARY,
      textTransform: "uppercase",
      margin: "10px 0 2px",
    },
    roundLabel: {
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: "0.06em",
      color: "#A79F96",
      margin: "9px 0 1px",
    },
    row: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "7px 0",
      borderTop: `1px solid #F2EFEB`,
    },
    box: {
      width: 22,
      height: 22,
      borderRadius: 6,
      border: `2px solid #D4CFC9`,
      background: SURFACE,
      color: "#fff",
      fontSize: 12,
      fontWeight: 700,
      flexShrink: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      padding: 0,
      WebkitTapHighlightColor: "transparent",
    },
    boxOn: { background: accent, border: `2px solid ${accent}` },
    rowName: { flex: 1, fontSize: 13.5, fontWeight: 600, color: TEXT, textAlign: "left" },
    rowNameOn: { color: "#A79F96" },
    rowReps: { fontWeight: 500, color: TEXT_SECONDARY },
    info: {
      width: 22,
      height: 22,
      borderRadius: "50%",
      border: `1.5px solid #D4CFC9`,
      background: "none",
      color: TEXT_SECONDARY,
      fontSize: 12,
      flexShrink: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      padding: 0,
      WebkitTapHighlightColor: "transparent",
    },
    rest: {
      fontSize: 11,
      fontWeight: 600,
      color: "#B7B0A8",
      textAlign: "center",
      padding: "8px 0 2px",
    },

    footer: {
      flexShrink: 0,
      padding: "12px 16px",
      paddingBottom: "max(16px, env(safe-area-inset-bottom))",
      borderTop: `1px solid ${BORDER}`,
      background: BG,
    },
    finishBtn: {
      fontFamily: "'DM Sans', sans-serif",
      width: "100%",
      background: accent,
      color: "#fff",
      border: "none",
      borderRadius: 14,
      padding: "15px",
      fontSize: 16,
      fontWeight: 700,
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    },
    leaveBtn: {
      fontFamily: "'DM Sans', sans-serif",
      width: "100%",
      background: "none",
      border: "none",
      color: TEXT_SECONDARY,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      marginTop: 8,
      padding: 6,
      WebkitTapHighlightColor: "transparent",
    },

    scrim: {
      position: "fixed",
      inset: 0,
      background: "rgba(45,42,38,0.5)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 100,
    },
    sheet: {
      background: SURFACE,
      borderRadius: "20px 20px 0 0",
      padding: "18px 18px 26px",
      width: "100%",
      maxWidth: 480,
      textAlign: "center",
      boxSizing: "border-box",
    },
    sheetMedia: {
      width: "100%",
      maxWidth: 260,
      aspectRatio: "1 / 1",
      margin: "0 auto 14px",
      borderRadius: 16,
      background: accentLight,
      color: accent,
      fontSize: 13,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    sheetName: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: "-0.02em",
      marginBottom: 6,
    },
    sheetReps: {
      display: "inline-block",
      background: accentLight,
      color: accent,
      fontWeight: 800,
      fontSize: 15,
      borderRadius: 10,
      padding: "5px 16px",
      marginBottom: 14,
    },
    tipBox: {
      border: `1.5px solid ${BORDER}`,
      borderRadius: 12,
      padding: "11px 12px",
      display: "flex",
      gap: 9,
      textAlign: "left",
    },
    tipIcon: { fontSize: 15, flexShrink: 0 },
    tipText: { fontSize: 12.5, lineHeight: 1.5, color: TEXT },
    sheetClose: {
      fontFamily: "'DM Sans', sans-serif",
      marginTop: 16,
      width: "100%",
      background: accent,
      color: "#fff",
      border: "none",
      borderRadius: 12,
      padding: 13,
      fontSize: 15,
      fontWeight: 700,
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    },

  };
}

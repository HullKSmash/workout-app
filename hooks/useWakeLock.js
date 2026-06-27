import { useEffect, useRef } from "react";

// Keeps the device screen awake while `active` is true, using the native
// Screen Wake Lock API. No-ops on browsers without support (e.g. iOS < 16.4).
// The OS automatically releases the lock whenever the page is hidden, so we
// re-acquire it when the page becomes visible again while still active.
//
// Side-effect only: holds no state and triggers no re-renders.
export function useWakeLock(active) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.wakeLock) {
      return;
    }

    let cancelled = false;

    const acquire = async () => {
      try {
        sentinelRef.current = await navigator.wakeLock.request("screen");
      } catch {
        // Acquisition can reject (low battery, permissions, page not visible).
        // Keeping the screen awake is an enhancement — never throw.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !cancelled) {
        acquire();
      }
    };

    acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) {
        sentinel.release().catch(() => {});
      }
    };
  }, [active]);
}

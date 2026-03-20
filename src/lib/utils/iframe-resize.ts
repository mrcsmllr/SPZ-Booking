"use client";

/**
 * Sendet die aktuelle Höhe per postMessage an das Parent-Fenster.
 * Nutzung in der Buchungsseite wenn via iFrame eingebunden.
 */
export function sendHeightToParent() {
  if (typeof window === "undefined") return;
  if (window.parent === window) return;

  const height = document.documentElement.scrollHeight;
  window.parent.postMessage(
    {
      type: "spz-booking-resize",
      height,
    },
    "*"
  );
}

/**
 * Beobachtet Größenänderungen und meldet sie ans Parent-Fenster.
 */
export function startHeightObserver() {
  if (typeof window === "undefined") return;
  if (window.parent === window) return;

  const observer = new ResizeObserver(() => {
    sendHeightToParent();
  });

  observer.observe(document.body);

  // Initial senden
  sendHeightToParent();

  return () => observer.disconnect();
}

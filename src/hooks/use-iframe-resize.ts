"use client";

import { useEffect } from "react";
import { startHeightObserver } from "@/lib/utils/iframe-resize";

/**
 * Hook für automatische iFrame-Höhenanpassung.
 * Aktiviert sich nur wenn die Seite in einem iFrame eingebunden ist.
 */
export function useIframeResize() {
  useEffect(() => {
    const cleanup = startHeightObserver();
    return cleanup;
  }, []);
}

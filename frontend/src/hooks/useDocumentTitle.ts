import { useEffect } from "react";

/**
 * Dynamically sets the browser tab title according to the current page / workspace.
 * Format:
 *   - Standalone: `${pageTitle} — TweetSense`
 *   - With context: `${context} · ${pageTitle} — TweetSense`
 */
export function useDocumentTitle(pageTitle: string, context?: string | null) {
  useEffect(() => {
    const base = "TweetSense";
    if (!pageTitle) {
      document.title = `${base} — Feedback Intelligence`;
      return;
    }

    if (context) {
      document.title = `${context} · ${pageTitle} — ${base}`;
    } else {
      document.title = `${pageTitle} — ${base}`;
    }
  }, [pageTitle, context]);
}

import { useEffect, useState } from "react";

/** Per-user UI prefs. Shared PCs must not leak hide-scores across accounts. */

export const hideScoresKey = (uid: string) => `karsa-hide-scores-${uid}`;

export function getHideScores(uid: string): boolean {
  try {
    return localStorage.getItem(hideScoresKey(uid)) === "true";
  } catch {
    return false;
  }
}

export function setHideScores(uid: string, hidden: boolean): void {
  try {
    localStorage.setItem(hideScoresKey(uid), hidden ? "true" : "false");
    window.dispatchEvent(new Event("karsa-prefs"));
  } catch {
    /* private mode */
  }
}

export function useHideScores(uid: string) {
  const [hidden, setHidden] = useState(() => getHideScores(uid));

  useEffect(() => {
    setHidden(getHideScores(uid));
    const sync = () => setHidden(getHideScores(uid));
    window.addEventListener("karsa-prefs", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("karsa-prefs", sync);
      window.removeEventListener("storage", sync);
    };
  }, [uid]);

  const toggle = (next: boolean) => {
    setHideScores(uid, next);
    setHidden(next);
  };

  return [hidden, toggle] as const;
}

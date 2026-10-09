import type { Character } from "./types";

/** Each Fatigue point is −1 on that character's rolls. 0 if they have none. */
export function fatiguePenalty(c: Pick<Character, "tracker"> | null | undefined): number {
  return Math.max(0, Math.floor(c?.tracker?.fatigue ?? 0));
}

/** What the current Fatigue is doing. Empty at 0. */
export function fatigueEffect(points: number): string {
  const n = Math.max(0, Math.floor(points));
  if (n <= 0) return "";
  return `−${n} to every roll.`;
}

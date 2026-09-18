import { getDayPart, getGreetingWord } from "./heroTime";

const cases: [number, string, string][] = [
  [5, "morning", "Pagi"],
  [10, "morning", "Pagi"],
  [11, "afternoon", "Siang"],
  [14, "afternoon", "Siang"],
  [15, "sunset", "Sore"],
  [23, "sunset", "Sore"],
  [0, "sunset", "Sore"],
  [4, "sunset", "Sore"],
];

for (const [h, part, word] of cases) {
  const d = new Date(2026, 8, 18, h, 0, 0);
  const gotPart = getDayPart(d);
  const gotWord = getGreetingWord(d);
  if (gotPart !== part) throw new Error(`hour ${h}: expected part ${part}, got ${gotPart}`);
  if (gotWord !== word) throw new Error(`hour ${h}: expected ${word}, got ${gotWord}`);
}

console.log("heroTime self-check: ok", cases.length, "cases");

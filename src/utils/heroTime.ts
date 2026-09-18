/** Laptop-local day part for hero video + greeting. WIB or whatever the device clock is. */

export type DayPart = "morning" | "afternoon" | "sunset";
export type GreetingWord = "Pagi" | "Siang" | "Sore";

/** Pagi 05–10, Siang 11–14, Sore–malam 15–04. */
export function getDayPart(d: Date = new Date()): DayPart {
  const h = d.getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 15) return "afternoon";
  return "sunset";
}

export function getGreetingWord(d: Date = new Date()): GreetingWord {
  const part = getDayPart(d);
  if (part === "morning") return "Pagi";
  if (part === "afternoon") return "Siang";
  return "Sore";
}

export function heroAsset(part: DayPart = getDayPart()) {
  return {
    video: `/hero/${part}.mp4`,
    poster: `/hero/${part}.jpg`,
  };
}

export function calculatePoints(input: {
  eventType?: string;
  boothType?: string;
}) {
  let points = 25;

  if (input.eventType === "BIRTHDAY") points += 10;
  if (input.eventType === "CORPORATE") points += 15;
  if (input.boothType === "ADVANCED") points += 5;

  return points;
}

export function getTier(points: number) {
  if (points >= 250) return "GOLD";
  if (points >= 100) return "SILVER";
  return "BRONZE";
}
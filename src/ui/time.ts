export function timeAgoFromTimestamp(ts: any) {
  // Firestore Timestamp has .seconds; serverTimestamp might be null briefly
  const seconds: number | null =
    ts?.seconds ?? (typeof ts?.toDate === "function" ? Math.floor(ts.toDate().getTime() / 1000) : null);

  if (!seconds) return "just now";

  const diff = Math.max(0, Math.floor(Date.now() / 1000) - seconds);

  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;

  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
import { getDocs, query, where } from "firebase/firestore";
import { refs } from "../../lib/firestoreRefs";

export type Booth = {
  id: string;
  venueId: string;
  label: string;
  type: "ADVANCED" | "STANDARD";
  active: boolean;
  sort: number;
};

export async function listBoothsForVenue(venueId: string): Promise<Booth[]> {
  const q = query(refs.booths(), where("venueId", "==", venueId));
  const snap = await getDocs(q);

  const booths = snap.docs
    .map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Booth, "id">),
    }))
    .filter((b) => b.active !== false)
    .sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999));

  console.log("Loaded booths:", booths);

  return booths;
}
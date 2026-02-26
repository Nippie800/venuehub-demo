import { getDocs, query, where } from "firebase/firestore";
import { refs } from "../../lib/firestoreRefs";

export async function listRestaurantsForVenue(venueId: string) {
  const q = query(refs.restaurants(), where("venueIds", "array-contains", venueId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
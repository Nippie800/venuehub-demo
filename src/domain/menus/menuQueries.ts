import { getDoc } from "firebase/firestore";
import { refs } from "../../lib/firestoreRefs";

export async function getMenu(restaurantId: string) {
  const snap = await getDoc(refs.menu(restaurantId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
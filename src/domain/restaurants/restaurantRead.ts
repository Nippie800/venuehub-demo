import { getDoc } from "firebase/firestore";
import { refs } from "../../lib/firestoreRefs";

export async function getRestaurantName(restaurantId: string) {
  const snap = await getDoc(refs.restaurant(restaurantId));
  if (!snap.exists()) return restaurantId;
  const data: any = snap.data();
  return data?.name ?? restaurantId;
}
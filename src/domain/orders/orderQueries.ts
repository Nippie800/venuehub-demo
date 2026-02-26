import { onSnapshot, orderBy, query, where } from "firebase/firestore";
import { refs } from "../../lib/firestoreRefs";

export function listenVenueOrders(venueId: string, cb: (orders: any[]) => void) {
  const q = query(
    refs.orders(),
    where("venueId", "==", venueId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
export function listenKitchenOrders(restaurantId: string, cb: (orders: any[]) => void) {
  const q = query(
    refs.orders(),
    where("restaurantId", "==", restaurantId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
import { serverTimestamp, updateDoc } from "firebase/firestore";
import { refs } from "../../lib/firestoreRefs";
import type { OrderStatus } from "./orderTypes";

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await updateDoc(refs.order(orderId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// Venue closes the loop
export async function markOrderDelivered(orderId: string) {
  await updateOrderStatus(orderId, "DELIVERED"); // we'll rename to DELIVERED or COLLECTED later
}
export async function setOrderRating(orderId: string, rating: "POSITIVE" | "NEUTRAL" | "NEGATIVE") {
  await updateDoc(refs.order(orderId), {
    rating,
    ratingAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
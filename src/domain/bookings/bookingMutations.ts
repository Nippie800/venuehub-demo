import { serverTimestamp, updateDoc } from "firebase/firestore";
import { refs } from "../../lib/firestoreRefs";

export async function updateBookingStatus(
  bookingId: string,
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED"
) {
  await updateDoc(refs.booking(bookingId), {
    status,
    updatedAt: serverTimestamp(),
  });
}
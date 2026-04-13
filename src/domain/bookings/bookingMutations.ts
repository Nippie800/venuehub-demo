import { serverTimestamp, updateDoc, getDoc } from "firebase/firestore";
import { refs } from "../../lib/firestoreRefs";
import { awardLoyaltyForCompletedBooking } from "../loyalty/loyaltyMutations";

export async function updateBookingStatus(
  bookingId: string,
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED"
) {
  const payload: Record<string, any> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === "CONFIRMED") {
    payload.confirmedAt = serverTimestamp();
    payload.notificationStatus = "PENDING";
    payload.notificationType = "APPROVAL";
  }

  if (status === "REJECTED") {
    payload.rejectedAt = serverTimestamp();
    payload.notificationStatus = "PENDING";
    payload.notificationType = "REJECTION";
  }

  if (status === "COMPLETED") {
    payload.completedAt = serverTimestamp();
  }

  await updateDoc(refs.booking(bookingId), payload);

  if (status === "COMPLETED") {
    const snap = await getDoc(refs.booking(bookingId));
    if (snap.exists()) {
      await awardLoyaltyForCompletedBooking({
        bookingId: snap.id,
        ...(snap.data() as any),
      });
    }
  }
}
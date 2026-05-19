import { serverTimestamp, updateDoc, getDoc } from "firebase/firestore";
import { refs } from "../../lib/firestoreRefs";
import { awardLoyaltyForCompletedBooking } from "../loyalty/loyaltyMutations";

export function normalizeBookingRef(value?: string) {
  return (value ?? "").trim().toUpperCase();
}

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

export async function completeBookingWithReference(
  bookingId: string,
  expectedBookingRef: string,
  enteredBookingRef: string
) {
  const expected = normalizeBookingRef(expectedBookingRef);
  const entered = normalizeBookingRef(enteredBookingRef);

  if (!expected) {
    throw new Error("This booking does not have a valid booking reference.");
  }

  if (!entered) {
    throw new Error("Booking reference required.");
  }

  if (entered !== expected) {
    throw new Error("Booking reference does not match.");
  }

  const payload: Record<string, any> = {
    status: "COMPLETED",
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(refs.booking(bookingId), payload);

  const snap = await getDoc(refs.booking(bookingId));
  if (snap.exists()) {
    await awardLoyaltyForCompletedBooking({
      bookingId: snap.id,
      ...(snap.data() as any),
    });
  }
}
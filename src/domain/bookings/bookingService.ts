import { addDoc, serverTimestamp } from "firebase/firestore";
import { refs } from "../../lib/firestoreRefs";

export type CreateBookingInput = {
  venueId: string;
  boothId: string;
  boothLabel: string;
  boothType: "ADVANCED" | "STANDARD";

  customerName: string;
  customerEmail: string;
  customerPhone: string;

  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  durationHours: number;

  eventType: "CASUAL" | "BIRTHDAY" | "CORPORATE";
  guestCount: number;
  notes?: string;
};

export async function createBooking(input: CreateBookingInput) {
  const payload = {
    ...input,
    notes: input.notes?.trim() ? input.notes.trim() : null,
    status: "PENDING",
    source: "CUSTOMER_APP",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(refs.bookings(), payload);
  return ref.id;
}
import {
  addDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { refs } from "../../lib/firestoreRefs";
import { normalizeEmail } from "../../utils/identity";

function buildBookingReference(count: number) {
  const year = new Date().getFullYear();
  return `GB-${year}-${String(count).padStart(4, "0")}`;
}

export async function createBooking(input: {
  venueId: string;
  boothId: string;
  boothLabel: string;
  boothType: string;

  customerName: string;
  customerEmail: string;
  customerPhone: string;

  bookingDate: string;
  startTime: string;
  endTime: string;
  durationHours: 1 | 2;

  eventType: string;
  guestCount: number;
  notes?: string;
}) {
  const normalizedEmail = normalizeEmail(input.customerEmail);

  // Count existing bookings for a simple reference sequence
  const existingSnap = await getDocs(
    query(refs.bookings(), where("venueId", "==", input.venueId))
  );

  const nextCount = existingSnap.size + 1;
  const bookingRef = buildBookingReference(nextCount);

  const docRef = await addDoc(refs.bookings(), {
    venueId: input.venueId,
    boothId: input.boothId,
    boothLabel: input.boothLabel,
    boothType: input.boothType,

    customerName: input.customerName.trim(),
    customerEmail: normalizedEmail,
    customerPhone: input.customerPhone.trim(),

    bookingDate: input.bookingDate,
    startTime: input.startTime,
    endTime: input.endTime,
    durationHours: input.durationHours,

    eventType: input.eventType,
    guestCount: input.guestCount,
    notes: input.notes?.trim() ? input.notes.trim() : null,

    status: "PENDING",
    notificationStatus: "NOT_REQUIRED",
    notificationType: null,

    reminderStatus: "NOT_SCHEDULED",
    reminderError: null,
    reminderSentAt: null,

    loyaltyAwardedAt: null,
    loyaltyPointsAwarded: 0,

    bookingRef,
    source: "CUSTOMER_APP",

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // optional: keep id mirrored in doc for easier UI use later
  await updateDoc(refs.booking(docRef.id), {
    id: docRef.id,
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}
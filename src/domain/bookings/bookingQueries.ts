import { getDocs, query, where } from "firebase/firestore";
import { refs } from "../../lib/firestoreRefs";

export type ExistingBooking = {
  id: string;
  venueId: string;
  boothId: string;
  boothLabel: string;
  boothType: "ADVANCED" | "STANDARD";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  eventType: "CASUAL" | "BIRTHDAY" | "CORPORATE";
  guestCount: number;
  notes?: string | null;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  source: string;
  createdAt?: any;
  updatedAt?: any;
};

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(
  newStart: string,
  newEnd: string,
  existingStart: string,
  existingEnd: string
) {
  const aStart = toMinutes(newStart);
  const aEnd = toMinutes(newEnd);
  const bStart = toMinutes(existingStart);
  const bEnd = toMinutes(existingEnd);

  return aStart < bEnd && aEnd > bStart;
}

export async function hasBookingConflict(input: {
  boothId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
}) {
  const q = query(
    refs.bookings(),
    where("boothId", "==", input.boothId),
    where("bookingDate", "==", input.bookingDate)
  );

  const snap = await getDocs(q);

  const bookings = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ExistingBooking, "id">),
  }));

  const activeBookings = bookings.filter(
    (b) =>
      b.status !== "CANCELLED" &&
      b.status !== "COMPLETED" &&
      b.status !== "REJECTED"
  );

  return activeBookings.some((b) =>
    overlaps(input.startTime, input.endTime, b.startTime, b.endTime)
  );
}

export async function listVenueBookings(venueId: string): Promise<ExistingBooking[]> {
  const q = query(refs.bookings(), where("venueId", "==", venueId));
  const snap = await getDocs(q);

  const rows = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ExistingBooking, "id">),
  }));

  rows.sort((a, b) => {
    if (a.bookingDate !== b.bookingDate) {
      return a.bookingDate.localeCompare(b.bookingDate);
    }
    return a.startTime.localeCompare(b.startTime);
  });

  console.log("Venue bookings loaded:", rows);

  return rows;
}
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

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD";

function calculatePoints(input: {
  eventType?: string;
  boothType?: string;
}) {
  let points = 25;

  if (input.eventType === "BIRTHDAY") points += 10;
  if (input.eventType === "CORPORATE") points += 15;
  if (input.boothType === "ADVANCED") points += 5;

  return points;
}

function getTier(points: number): LoyaltyTier {
  if (points >= 250) return "GOLD";
  if (points >= 100) return "SILVER";
  return "BRONZE";
}

type CompletedBookingInput = {
  bookingId: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string | null;
  eventType?: string;
  boothType?: string;
  loyaltyAwardedAt?: any;
};

export async function awardLoyaltyForCompletedBooking(
  booking: CompletedBookingInput
) {
  const customerEmail = normalizeEmail(booking.customerEmail);
  const customerName = booking.customerName?.trim();

  if (!customerEmail || !customerName) return;

  if (booking.loyaltyAwardedAt) return;

  const pointsToAdd = calculatePoints({
    eventType: booking.eventType,
    boothType: booking.boothType,
  });

  const q = query(
    refs.loyaltyProfiles(),
    where("customerEmail", "==", customerEmail)
  );

  const existing = await getDocs(q);

  if (existing.empty) {
    const totalPoints = pointsToAdd;
    const totalVisits = 1;
    const completedBookings = 1;

    await addDoc(refs.loyaltyProfiles(), {
      customerEmail,
      customerName,
      customerPhone: booking.customerPhone ?? null,

      totalPoints,
      totalVisits,
      completedBookings,
      currentTier: getTier(totalPoints),

      lastVisitAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    const profileDoc = existing.docs[0];
    const data = profileDoc.data() as any;

    const totalPoints = (data.totalPoints ?? 0) + pointsToAdd;
    const totalVisits = (data.totalVisits ?? 0) + 1;
    const completedBookings = (data.completedBookings ?? 0) + 1;

    await updateDoc(refs.loyaltyProfile(profileDoc.id), {
      customerName,
      customerPhone: booking.customerPhone ?? null,

      totalPoints,
      totalVisits,
      completedBookings,
      currentTier: getTier(totalPoints),

      lastVisitAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await updateDoc(refs.booking(booking.bookingId), {
    loyaltyAwardedAt: serverTimestamp(),
    loyaltyPointsAwarded: pointsToAdd,
    updatedAt: serverTimestamp(),
  });
}
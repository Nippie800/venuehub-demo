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

export type LoyaltyLeague =
  | "Newcomer"
  | "Journeyman"
  | "Expert"
  | "Professional"
  | "Master"
  | "Legend"
  | "Trailblazer"
  | "Ascendant"
  | "Crest";

function calculatePoints() {
  return 30;
}

function getLeague(points: number): LoyaltyLeague {
  if (points >= 3000) return "Crest";
  if (points >= 2250) return "Ascendant";
  if (points >= 1500) return "Trailblazer";
  if (points >= 1000) return "Legend";
  if (points >= 750) return "Master";
  if (points >= 400) return "Professional";
  if (points >= 270) return "Expert";
  if (points >= 50) return "Journeyman";
  return "Newcomer";
}

function getRewardsEarned(completedBookings: number) {
  return Math.floor(completedBookings / 7);
}

function getBookingsUntilNextReward(completedBookings: number) {
  const remainder = completedBookings % 7;
  return remainder === 0 ? 7 : 7 - remainder;
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

  const pointsToAdd = calculatePoints();

  const q = query(
    refs.loyaltyProfiles(),
    where("customerEmail", "==", customerEmail)
  );

  const existing = await getDocs(q);

  if (existing.empty) {
    const totalPoints = pointsToAdd;
    const totalVisits = 1;
    const completedBookings = 1;
    const rewardsEarned = getRewardsEarned(completedBookings);
    const bookingsUntilNextReward = getBookingsUntilNextReward(completedBookings);

    await addDoc(refs.loyaltyProfiles(), {
      customerEmail,
      customerName,
      customerPhone: booking.customerPhone ?? null,

      totalPoints,
      totalVisits,
      completedBookings,
      currentLeague: getLeague(totalPoints),

      rewardsEarned,
      bookingsUntilNextReward,

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
    const rewardsEarned = getRewardsEarned(completedBookings);
    const bookingsUntilNextReward = getBookingsUntilNextReward(completedBookings);

    await updateDoc(refs.loyaltyProfile(profileDoc.id), {
      customerName,
      customerPhone: booking.customerPhone ?? null,

      totalPoints,
      totalVisits,
      completedBookings,
      currentLeague: getLeague(totalPoints),

      rewardsEarned,
      bookingsUntilNextReward,

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
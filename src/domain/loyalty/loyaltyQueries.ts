import { getDoc, getDocs, query, where } from "firebase/firestore";
import { refs } from "../../lib/firestoreRefs";
import { normalizeEmail } from "../../utils/identity";

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD";

export type LoyaltyProfile = {
  id: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string | null;

  totalPoints: number;
  totalVisits: number;
  completedBookings: number;

  currentTier: LoyaltyTier;
  lastVisitAt?: any;
  createdAt?: any;
  updatedAt?: any;
};

export async function getLoyaltyProfileByEmail(
  customerEmail: string
): Promise<LoyaltyProfile | null> {
  const normalizedEmail = normalizeEmail(customerEmail);
  if (!normalizedEmail) return null;

  const q = query(
    refs.loyaltyProfiles(),
    where("customerEmail", "==", normalizedEmail)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  return {
    id: docSnap.id,
    ...(docSnap.data() as Omit<LoyaltyProfile, "id">),
  };
}

export async function getLoyaltyProfileById(
  profileId: string
): Promise<LoyaltyProfile | null> {
  const snap = await getDoc(refs.loyaltyProfile(profileId));
  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...(snap.data() as Omit<LoyaltyProfile, "id">),
  };
}

export async function listLeaderboard(): Promise<LoyaltyProfile[]> {
  const snap = await getDocs(refs.loyaltyProfiles());

  const rows = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<LoyaltyProfile, "id">),
  }));

  rows.sort((a, b) => {
    if ((b.totalPoints ?? 0) !== (a.totalPoints ?? 0)) {
      return (b.totalPoints ?? 0) - (a.totalPoints ?? 0);
    }

    return (b.totalVisits ?? 0) - (a.totalVisits ?? 0);
  });

  return rows;
}
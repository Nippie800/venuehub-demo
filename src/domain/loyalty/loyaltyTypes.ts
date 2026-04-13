export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD";

export type LoyaltyProfile = {
  id: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  totalPoints: number;
  totalVisits: number;
  completedBookings: number;
  currentTier: LoyaltyTier;
  lastVisitAt?: any;
  createdAt?: any;
  updatedAt?: any;
};
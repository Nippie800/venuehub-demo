import { addDoc, serverTimestamp } from "firebase/firestore";
import { refs } from "../lib/firestoreRefs";

export async function seedLoyaltyProfiles() {
  const samples = [
    {
      customerName: "Annele",
      customerEmail: "annele@golfbar.demo",
      totalPoints: 120,
      totalVisits: 4,
      completedBookings: 4,
    },
    {
      customerName: "DONDADA",
      customerEmail: "dondada@golfbar.demo",
      totalPoints: 30,
      totalVisits: 1,
      completedBookings: 1,
    },
    {
      customerName: "Musa",
      customerEmail: "musa@golfbar.demo",
      totalPoints: 420,
      totalVisits: 14,
      completedBookings: 14,
    },
    {
      customerName: "Lebo",
      customerEmail: "lebo@golfbar.demo",
      totalPoints: 810,
      totalVisits: 27,
      completedBookings: 27,
    },
    {
      customerName: "Thato",
      customerEmail: "thato@golfbar.demo",
      totalPoints: 1080,
      totalVisits: 36,
      completedBookings: 36,
    },
    {
      customerName: "Aphiwe",
      customerEmail: "aphiwe@golfbar.demo",
      totalPoints: 1560,
      totalVisits: 52,
      completedBookings: 52,
    },
    {
      customerName: "Neo",
      customerEmail: "neo@golfbar.demo",
      totalPoints: 2310,
      totalVisits: 77,
      completedBookings: 77,
    },
    {
      customerName: "Kamva",
      customerEmail: "kamva@golfbar.demo",
      totalPoints: 3120,
      totalVisits: 104,
      completedBookings: 104,
    },
    {
      customerName: "Siya",
      customerEmail: "siya@golfbar.demo",
      totalPoints: 5050,
      totalVisits: 168,
      completedBookings: 168,
    },
  ];

  function getLeague(points: number) {
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

  for (const user of samples) {
    const rewardsEarned = Math.floor(user.completedBookings / 7);
    const remainder = user.completedBookings % 7;
    const bookingsUntilNextReward = remainder === 0 ? 7 : 7 - remainder;

    await addDoc(refs.loyaltyProfiles(), {
      ...user,
      currentLeague: getLeague(user.totalPoints),

      rewardsEarned,
      bookingsUntilNextReward,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  console.log("🔥 Loyalty profiles seeded successfully");
}
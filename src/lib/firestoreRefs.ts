import { collection, doc } from "firebase/firestore";
import { db } from "./firebase";

export const refs = {
  db,
  venue: (venueId: string) => doc(db, "venues", venueId),
  venues: () => collection(db, "venues"),

  booths: () => collection(db, "booths"),
  booth: (boothId: string) => doc(db, "booths", boothId),

  bookings: () => collection(db, "bookings"),
  booking: (bookingId: string) => doc(db, "bookings", bookingId),
  
  restaurant: (restaurantId: string) => doc(db, "restaurants", restaurantId),
  restaurants: () => collection(db, "restaurants"),

  menu: (restaurantId: string) => doc(db, "menus", restaurantId), // doc id = restaurantId
  menus: () => collection(db, "menus"),

  order: (orderId: string) => doc(db, "orders", orderId),
  orders: () => collection(db, "orders"),

  loyaltyProfiles: () => collection(db, "loyaltyProfiles"),
  loyaltyProfile: (profileId: string) => doc(db, "loyaltyProfiles", profileId),
  
   venueTable: (venueId: string, tableId: string) =>
    doc(db, "venues", venueId, "tables", tableId),
};
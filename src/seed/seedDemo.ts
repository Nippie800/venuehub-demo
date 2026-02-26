import { writeBatch, serverTimestamp } from "firebase/firestore";
import { refs } from "../lib/firestoreRefs";
import type { VenueDoc, RestaurantDoc, MenuDoc } from "../types/firestore";

const now = () => serverTimestamp();

export async function seedDemo() {
  const batch = writeBatch((await import("../lib/firebase")).db);

  // ✅ Stable IDs
  const venueId = "venue_golfbar_cs";
  const r1 = "rest_smokedaddys";
  const r2 = "rest_pizza_palace";
  const r3 = "rest_sushi_spot";

  // ---------- Venue ----------
  const venue: VenueDoc = {
    name: "Golf Bar – Cedar Square",
    slug: "golf-bar-cedar-square",
    isActive: true,
    createdAt: now(),
  };
  batch.set(refs.venue(venueId), venue, { merge: true });

  // ---------- Restaurants ----------
  const restaurants: Record<string, RestaurantDoc> = {
    [r1]: {
      name: "Smoke Daddys",
      slug: "smoke-daddys",
      isActive: true,
      venueIds: [venueId],
      prepTimeMins: 25,
      createdAt: now(),
    },
    [r2]: {
      name: "Pizza Palace",
      slug: "pizza-palace",
      isActive: true,
      venueIds: [venueId],
      prepTimeMins: 18,
      createdAt: now(),
    },
    [r3]: {
      name: "Sushi Spot",
      slug: "sushi-spot",
      isActive: true,
      venueIds: [venueId],
      prepTimeMins: 30,
      createdAt: now(),
    },
  };

  for (const [id, doc] of Object.entries(restaurants)) {
    batch.set(refs.restaurant(id), doc, { merge: true });
  }

  // ---------- Menus (doc id = restaurantId) ----------
  const menuSmoke: MenuDoc = {
    restaurantId: r1,
    currency: "ZAR",
    categories: [
      { id: "cat_bbq", name: "BBQ", sort: 1 },
      { id: "cat_burgers", name: "Burgers", sort: 2 },
      { id: "cat_sides", name: "Sides", sort: 3 },
      { id: "cat_drinks", name: "Drinks", sort: 4 },
    ],
    items: [
      { id: "item_brisket", name: "Brisket Plate", description: "Smoked brisket + 2 sides", price: 165, categoryId: "cat_bbq", isAvailable: true, sort: 1 },
      { id: "item_ribs", name: "Pork Ribs", description: "Sticky ribs + slaw", price: 180, categoryId: "cat_bbq", isAvailable: true, sort: 2 },
      { id: "item_wings", name: "Smoked Wings", description: "8 wings, house sauce", price: 95, categoryId: "cat_bbq", isAvailable: true, sort: 3 },

      { id: "item_classic_burger", name: "Classic Burger", description: "Beef patty, cheese, pickles", price: 110, categoryId: "cat_burgers", isAvailable: true, sort: 1 },
      { id: "item_bbq_burger", name: "BBQ Burger", description: "BBQ sauce, onion rings", price: 125, categoryId: "cat_burgers", isAvailable: true, sort: 2 },

      { id: "item_fries", name: "Fries", price: 35, categoryId: "cat_sides", isAvailable: true, sort: 1 },
      { id: "item_slaw", name: "Coleslaw", price: 30, categoryId: "cat_sides", isAvailable: true, sort: 2 },
      { id: "item_mac", name: "Mac & Cheese", price: 45, categoryId: "cat_sides", isAvailable: true, sort: 3 },

      { id: "item_coke", name: "Coke (330ml)", price: 22, categoryId: "cat_drinks", isAvailable: true, sort: 1 },
      { id: "item_water", name: "Still Water", price: 18, categoryId: "cat_drinks", isAvailable: true, sort: 2 },
    ],
    updatedAt: now(),
  };

  const menuPizza: MenuDoc = {
    restaurantId: r2,
    currency: "ZAR",
    categories: [
      { id: "cat_pizza", name: "Pizza", sort: 1 },
      { id: "cat_pasta", name: "Pasta", sort: 2 },
      { id: "cat_sides", name: "Sides", sort: 3 },
    ],
    items: [
      { id: "item_margherita", name: "Margherita", description: "Tomato, mozzarella, basil", price: 95, categoryId: "cat_pizza", isAvailable: true, sort: 1 },
      { id: "item_pepperoni", name: "Pepperoni", description: "Pepperoni + mozzarella", price: 115, categoryId: "cat_pizza", isAvailable: true, sort: 2 },
      { id: "item_bbqchicken", name: "BBQ Chicken", description: "BBQ sauce, chicken, onion", price: 125, categoryId: "cat_pizza", isAvailable: true, sort: 3 },
      { id: "item_veggie", name: "Garden Veggie", description: "Mushroom, peppers, olives", price: 110, categoryId: "cat_pizza", isAvailable: true, sort: 4 },

      { id: "item_alfredo", name: "Chicken Alfredo", price: 120, categoryId: "cat_pasta", isAvailable: true, sort: 1 },
      { id: "item_bolognese", name: "Beef Bolognese", price: 115, categoryId: "cat_pasta", isAvailable: true, sort: 2 },

      { id: "item_garlicbread", name: "Garlic Bread", price: 35, categoryId: "cat_sides", isAvailable: true, sort: 1 },
      { id: "item_salad", name: "Side Salad", price: 40, categoryId: "cat_sides", isAvailable: true, sort: 2 },
    ],
    updatedAt: now(),
  };

  const menuSushi: MenuDoc = {
    restaurantId: r3,
    currency: "ZAR",
    categories: [
      { id: "cat_rolls", name: "Rolls", sort: 1 },
      { id: "cat_bowls", name: "Bowls", sort: 2 },
      { id: "cat_sides", name: "Sides", sort: 3 },
      { id: "cat_drinks", name: "Drinks", sort: 4 },
    ],
    items: [
      { id: "item_california", name: "California Roll (8pc)", price: 85, categoryId: "cat_rolls", isAvailable: true, sort: 1 },
      { id: "item_spicy_tuna", name: "Spicy Tuna Roll (8pc)", price: 95, categoryId: "cat_rolls", isAvailable: true, sort: 2 },
      { id: "item_salmon_avocado", name: "Salmon Avocado Roll (8pc)", price: 105, categoryId: "cat_rolls", isAvailable: true, sort: 3 },

      { id: "item_chicken_teriyaki", name: "Chicken Teriyaki Bowl", price: 120, categoryId: "cat_bowls", isAvailable: true, sort: 1 },
      { id: "item_salmon_poke", name: "Salmon Poke Bowl", price: 135, categoryId: "cat_bowls", isAvailable: true, sort: 2 },

      { id: "item_miso", name: "Miso Soup", price: 28, categoryId: "cat_sides", isAvailable: true, sort: 1 },
      { id: "item_edamame", name: "Edamame", price: 35, categoryId: "cat_sides", isAvailable: true, sort: 2 },

      { id: "item_icedtea", name: "Iced Tea", price: 25, categoryId: "cat_drinks", isAvailable: true, sort: 1 },
      { id: "item_sparkling", name: "Sparkling Water", price: 22, categoryId: "cat_drinks", isAvailable: true, sort: 2 },
    ],
    updatedAt: now(),
  };

  batch.set(refs.menu(r1), menuSmoke, { merge: true });
  batch.set(refs.menu(r2), menuPizza, { merge: true });
  batch.set(refs.menu(r3), menuSushi, { merge: true });

  await batch.commit();

  return {
    venueId,
    restaurants: [r1, r2, r3],
  };
}
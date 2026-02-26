export type VenueDoc = {
  name: string;
  slug: string;             // "golf-bar-cedar-square"
  isActive: boolean;
  createdAt: any;
};

export type RestaurantDoc = {
  name: string;
  slug: string;
  isActive: boolean;
  venueIds: string[];       // venues they serve (for demo: ["venue_golfbar_cs"])
  prepTimeMins: number;     // demo label
  createdAt: any;
};

export type MenuDoc = {
  restaurantId: string;
  currency: "ZAR";
  categories: { id: string; name: string; sort: number }[];
  items: {
    id: string;
    name: string;
    description?: string;
    price: number;
    categoryId: string;
    isAvailable: boolean;
    sort: number;
  }[];
  updatedAt: any;
};

export type OrderStatus =
  | "PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export type OrderDoc = {
  venueId: string;
  restaurantId: string;
  tableId: string;          // "G7"
  status: OrderStatus;
  items: { itemId: string; name: string; qty: number; price: number }[];
  subtotal: number;
  notes?: string;
  createdAt: any;
  updatedAt: any;
};
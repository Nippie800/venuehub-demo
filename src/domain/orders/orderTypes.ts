export type OrderStatus =
  | "PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export type OrderItem = {
  itemId: string;
  name: string;
  qty: number;
  price: number; // price per item
};

export type CreateOrderInput = {
  venueId: string;
  restaurantId: string;
  tableId: string; // "G7"
  items: OrderItem[];
  notes?: string;
};

export type OrderDoc = {
  venueId: string;
  restaurantId: string;
  tableId: string;

  status: OrderStatus;

  items: OrderItem[];
  subtotal: number;

  createdAt: any;
  updatedAt: any;

  // demo-friendly (optional)
  clientOrderKey?: string; // helps prevent double submit
};
import {
  addDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  doc,
} from "firebase/firestore";
import { refs } from "../../lib/firestoreRefs";

type OrderItem = { itemId: string; name: string; qty: number; price: number };

export async function createOrder(input: {
  venueId: string;
  restaurantId: string;
  tableId: string;
  items: OrderItem[];
  notes?: string;

  // ✅ Reliability / infra fields (optional)
  clientOrderKey?: string;       // UUID from client
  orderIdOverride?: string;      // deterministic order id
}) {
  // Snapshot restaurant for denormalized instant UI
  const restaurantSnap = await getDoc(refs.restaurant(input.restaurantId));
  const restaurantData: any = restaurantSnap.exists() ? restaurantSnap.data() : null;

  const subtotal = input.items.reduce((sum, i) => sum + i.qty * i.price, 0);

  // ✅ status timestamps (enterprise feel)
  // For demo: placedAt is enough; later you’ll fill acceptedAt/preparingAt/readyAt/deliveredAt.
  const nowTs = serverTimestamp();

  const order = {
    venueId: input.venueId,
    restaurantId: input.restaurantId,

    // ✅ denormalized snapshot for instant UI + auditability
    restaurantName: restaurantData?.name ?? input.restaurantId,
    restaurantPrepTimeMins: restaurantData?.prepTimeMins ?? 20,

    tableId: input.tableId,
    items: input.items,
    notes: input.notes?.trim() ? input.notes.trim() : null,

    status: "PLACED",
    subtotal,

    // ✅ reliability fields
    clientOrderKey: input.clientOrderKey ?? null,

    // ✅ timestamps
    createdAt: nowTs,
    updatedAt: nowTs,
    placedAt: nowTs,

    // future timestamps (null for now)
    acceptedAt: null,
    preparingAt: null,
    readyAt: null,
    deliveredAt: null,
  };

  // ✅ deterministic write (prevents duplicates)
  if (input.orderIdOverride) {
    const orderRef = doc(refs.db, "orders", input.orderIdOverride);

    // setDoc will overwrite if same id exists (shouldn’t happen with UUID).
    // If you want hard rejection later: use a transaction + "exists" check.
    await setDoc(orderRef, order, { merge: false });

    return input.orderIdOverride;
  }

  // fallback normal path
  const refCreated = await addDoc(refs.orders(), order);
  return refCreated.id;
}
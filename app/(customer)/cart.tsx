import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createOrder } from "../../src/domain/orders/orderService";
import { theme } from "../../src/ui/theme";

type CartItem = {
  itemId: string;
  name?: string;
  price?: number;
  qty: number;
};

function safeParse(raw?: string): any {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function lastOrderKey(venueId: string, tableId: string) {
  return `venuehub:lastOrder:${venueId}:${tableId}`;
}

export default function CartScreen() {
  const { venueId, tableId, restaurantId, cart, subtotal } = useLocalSearchParams<{
    venueId: string;
    tableId: string;
    restaurantId: string;
    cart: string;
    subtotal: string;
  }>();

  const { width } = useWindowDimensions();
  const hPad = useMemo(() => (width < 380 ? 16 : 24), [width]);

  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);

  /**
   * Supports BOTH:
   * A) Array format: [{ itemId, name, price, qty }]
   * B) Map format: { [itemId]: qty }
   */
  const cartItems: CartItem[] = useMemo(() => {
    const parsed = safeParse(cart);

    // A) already an array
    if (Array.isArray(parsed)) {
      return parsed
        .filter(Boolean)
        .map((x: any) => ({
          itemId: String(x.itemId ?? x.id ?? ""),
          name: x.name,
          price: typeof x.price === "number" ? x.price : Number(x.price),
          qty: Number(x.qty ?? 0),
        }))
        .filter((x) => x.itemId && x.qty > 0);
    }

    // B) map { itemId: qty }
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed).map(([itemId, qty]) => ({
        itemId,
        qty: Number(qty ?? 0),
      }));
    }

    return [];
  }, [cart]);

  const computedSubtotal = useMemo(() => {
    return cartItems.reduce((sum, i) => sum + Number(i.price ?? 0) * i.qty, 0);
  }, [cartItems]);

  const finalSubtotal = useMemo(() => {
    const passed = Number(subtotal);
    if (Number.isFinite(passed) && passed > 0) return passed;
    return computedSubtotal;
  }, [subtotal, computedSubtotal]);

  const placeOrder = async () => {
    if (!venueId || !tableId || !restaurantId) {
      Alert.alert("Missing context", "venue/table/restaurant missing.");
      return;
    }
    if (cartItems.length === 0) {
      Alert.alert("Cart empty", "Add items first.");
      return;
    }

    // If cart came as map, we don’t have names/prices → block
    const missingDetails = cartItems.some(
      (i) => !i.name || typeof i.price !== "number" || Number.isNaN(i.price)
    );
    if (missingDetails) {
      Alert.alert(
        "Cart needs item details",
        "Your cart was sent without item prices/names. Please go back and reopen the menu, then try again."
      );
      return;
    }

    try {
      setPlacing(true);

      const orderId = await createOrder({
        venueId,
        restaurantId,
        tableId,
        items: cartItems.map((i) => ({
          itemId: i.itemId,
          name: i.name!,
          qty: i.qty,
          price: i.price!,
        })),
        notes: notes.trim() ? notes.trim() : undefined,
      });

      // ✅ Save last order for "View status" pill on menu (per venue+table)
      // store JSON so we can optionally filter by restaurant on menu
      await AsyncStorage.setItem(
        lastOrderKey(venueId, tableId),
        JSON.stringify({ orderId, restaurantId })
      );

      router.replace(`/(customer)/order/${orderId}`);
    } catch (e: any) {
      console.log(e);
      Alert.alert("Order failed ❌", e?.message ?? "Unknown error");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: hPad,
          paddingTop: 18,
          paddingBottom: 28,
          gap: 12,
        }}
      >
        <View style={{ width: "100%", maxWidth: 520, alignSelf: "center" }}>
          <Text style={styles.title}>Your Cart</Text>
          <Text style={styles.sub}>
            Venue: {venueId} • Table: {tableId}
          </Text>

          <View style={{ height: 10 }} />

          {cartItems.length === 0 ? (
            <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "800" }}>
              Cart is empty.
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {cartItems.map((i) => (
                <View key={i.itemId} style={styles.card}>
                  <Text style={{ color: "white", fontWeight: "900" }}>
                    {i.qty}× {i.name ?? i.itemId}
                  </Text>

                  {typeof i.price === "number" && !Number.isNaN(i.price) ? (
                    <>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.7)",
                          fontWeight: "700",
                          marginTop: 4,
                        }}
                      >
                        R{i.price} each
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.goldSoft,
                          fontWeight: "900",
                          marginTop: 6,
                        }}
                      >
                        Line: R{i.qty * i.price}
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.65)",
                        fontWeight: "700",
                        marginTop: 6,
                      }}
                    >
                      Price will appear after refresh
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 10 }} />

          <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }}>
            Subtotal: R{finalSubtotal}
          </Text>

          <Text style={{ color: "white", fontWeight: "900", marginTop: 10 }}>
            Notes (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. no onions, extra sauce"
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={styles.input}
          />

          <Pressable
            disabled={placing}
            onPress={placeOrder}
            style={({ pressed }) => [
              styles.primaryBtn,
              placing && { opacity: 0.6 },
              pressed && !placing && { opacity: 0.92 },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {placing ? "Placing..." : "Place Order"}
            </Text>
          </Pressable>

          <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 6, fontWeight: "700" }}>
            Demo: No payments. Orders route directly to partner kitchens.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { color: "white", fontSize: 24, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.70)", marginTop: 6, fontWeight: "800" },

  card: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  input: {
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#0d1f17",
    color: "white",
    fontWeight: "800",
  },
  primaryBtn: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.gold,
  },
  primaryBtnText: { color: "#111", fontWeight: "900", textAlign: "center" },
});
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  useWindowDimensions,
  Image,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { getMenu } from "../../../../src/domain/menus/menuQueries";
import { theme } from "../../../../src/ui/theme";
import { Pill } from "../../../../src/ui/components";

import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { db, storage } from "../../../../src/lib/firebase";
import { refs } from "../../../../src/lib/firestoreRefs";

type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  isAvailable: boolean;
  sort: number;
  imagePath?: string; // Firestore: e.g. "menuItems/smoke_daddys/bbqburger.png"
  imageUrl?: string; // resolved at runtime
};

type MenuDoc = {
  categories: { id: string; name: string; sort: number }[];
  items: MenuItem[];
};

type RestaurantDoc = {
  name: string;
  logoPath?: string; // e.g. "restaurants/smoke_daddys/smokedaddylogo.jpg"
  logoUrl?: string;
};

type CartItem = {
  itemId: string;
  name: string;
  price: number;
  qty: number;
};

function normalizeStoragePath(input?: string | null) {
  if (!input) return null;
  if (input.startsWith("gs://")) {
    const parts = input.split("/");
    return parts.slice(3).join("/");
  }
  return input;
}

async function resolveStorageUrl(pathOrGs?: string | null) {
  const path = normalizeStoragePath(pathOrGs);
  if (!path) return null;
  try {
    return await getDownloadURL(ref(storage, path));
  } catch {
    return null;
  }
}

function lastOrderKey(venueId: string, tableId: string) {
  return `venuehub:lastOrder:${venueId}:${tableId}`;
}

export default function RestaurantMenuScreen() {
  const { restaurantId, venueId, tableId } = useLocalSearchParams<{
    restaurantId?: string;
    venueId?: string;
    tableId?: string;
  }>();

  const { width } = useWindowDimensions();
  const hPad = useMemo(() => (width < 380 ? 16 : 24), [width]);

  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<MenuDoc | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});

  const [restaurant, setRestaurant] = useState<RestaurantDoc | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // ✅ Premium “Live status” button
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Load menu + restaurant + images
  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!restaurantId) return;

      try {
        setLoading(true);

        const [m, rSnap] = await Promise.all([
          getMenu(restaurantId),
          getDoc(doc(db, "restaurants", restaurantId)),
        ]);

        if (!mounted) return;

        const menuDoc = (m as any) as MenuDoc | null;

        // Resolve item images once (imagePath -> imageUrl) + prefetch
        const withImages: MenuDoc | null = menuDoc
          ? {
              ...menuDoc,
              items: await Promise.all(
                (menuDoc.items ?? []).map(async (it) => {
                  if (it.imageUrl) {
                    Image.prefetch(it.imageUrl);
                    return it;
                  }
                  const url = await resolveStorageUrl(it.imagePath ?? null);
                  if (url) Image.prefetch(url);
                  return url ? { ...it, imageUrl: url } : it;
                })
              ),
            }
          : null;

        setMenu(withImages);

        const first = withImages?.categories
          ?.slice()
          ?.sort((a, b) => a.sort - b.sort)?.[0];
        setActiveCategory(first?.id ?? null);

        // Restaurant doc + logo
        const rData = rSnap.exists() ? ((rSnap.data() as any) as RestaurantDoc) : null;
        setRestaurant(rData);

        const direct = rData?.logoUrl;
        if (direct) {
          setLogoUrl(direct);
          Image.prefetch(direct);
        } else {
          const url = await resolveStorageUrl(rData?.logoPath ?? null);
          if (mounted) setLogoUrl(url);
          if (url) Image.prefetch(url);
        }
      } catch (e) {
        console.log(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  // ✅ Listen for last order (only show if active + same restaurant + not delivered)
  useEffect(() => {
    let unsub: null | (() => void) = null;
    let alive = true;

    (async () => {
      if (!venueId || !tableId) return;

      const key = lastOrderKey(venueId, tableId);
      const raw = await AsyncStorage.getItem(key);
      if (!alive) return;

      const parsed = raw ? JSON.parse(raw) : null;
      const lastId: string | undefined = parsed?.orderId;

      if (!lastId) {
        setActiveOrderId(null);
        return;
      }

      unsub = onSnapshot(refs.order(lastId), async (snap) => {
        if (!snap.exists()) {
          setActiveOrderId(null);
          await AsyncStorage.removeItem(key);
          return;
        }

        const data: any = snap.data();
        const status = data?.status;
        const sameRestaurant = data?.restaurantId === restaurantId;

        // If it isn't for THIS restaurant menu, don't show the button here.
        if (!sameRestaurant) {
          setActiveOrderId(null);
          return;
        }

        if (status === "DELIVERED") {
          setActiveOrderId(null);
          await AsyncStorage.removeItem(key);
        } else {
          setActiveOrderId(lastId);
        }
      });
    })();

    return () => {
      alive = false;
      if (unsub) unsub();
    };
  }, [venueId, tableId, restaurantId]);

  const categories = useMemo(() => {
    if (!menu) return [];
    return [...menu.categories].sort((a, b) => a.sort - b.sort);
  }, [menu]);

  const items = useMemo(() => {
    if (!menu || !activeCategory) return [];
    return menu.items
      .filter((i) => i.categoryId === activeCategory && i.isAvailable)
      .sort((a, b) => a.sort - b.sort);
  }, [menu, activeCategory]);

  // Build detailed cart array for Cart screen + order write
  const cartList: CartItem[] = useMemo(() => {
    if (!menu) return [];
    return Object.entries(cart)
      .map(([id, qty]) => {
        const it = menu.items.find((x) => x.id === id);
        if (!it) return null;
        return { itemId: id, name: it.name, price: it.price, qty: Number(qty) };
      })
      .filter(Boolean) as CartItem[];
  }, [cart, menu]);

  const cartCount = useMemo(() => cartList.reduce((sum, i) => sum + i.qty, 0), [cartList]);

  const subtotal = useMemo(() => cartList.reduce((sum, i) => sum + i.qty * i.price, 0), [cartList]);

  const adjust = (id: string, delta: number) => {
    setCart((prev) => {
      const next = (prev[id] ?? 0) + delta;
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  };

  if (!restaurantId || !venueId || !tableId) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.bg }]}>
        <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "900" }}>Missing route params</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 8 }}>
            Need restaurantId + venueId + tableId
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: hPad, paddingTop: 18, paddingBottom: 140 },
        ]}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.logoWrap}>
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.logoImg} resizeMode="contain" />
              ) : (
                <View style={styles.logoFallback}>
                  <Text style={styles.logoFallbackText}>
                    {(restaurant?.name ?? "R")[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{restaurant?.name ?? "Menu"}</Text>
              <Text style={styles.subTitle}>In-venue ordering • Routed to kitchen</Text>
            </View>
          </View>

          {/* ✅ Table pill + Live status button (perfect spacing on phone + web) */}
          <View style={styles.topRow}>
            <Pill label={`Table ${tableId}`} />

            {!!activeOrderId && (
              <Pressable
                onPress={() => router.push(`/(customer)/order/${activeOrderId}`)}
                style={({ pressed }) => [styles.statusBtn, pressed && { opacity: 0.92 }]}
              >
                <Text style={styles.statusBtnText}>Live status • View order</Text>
              </Pressable>
            )}
          </View>

          {loading ? (
            <View style={{ marginTop: 18 }}>
              <ActivityIndicator color={theme.colors.gold} />
            </View>
          ) : !menu ? (
            <Text style={[styles.body, { marginTop: 18 }]}>Menu unavailable.</Text>
          ) : (
            <>
              {/* Categories */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 10 }}
              >
                <View style={{ flexDirection: "row" }}>
                  {categories.map((c, idx) => {
                    const active = c.id === activeCategory;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setActiveCategory(c.id)}
                        style={[
                          styles.chip,
                          active && styles.chipActive,
                          idx !== 0 && { marginLeft: 10 },
                        ]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Items (Uber Eats style) */}
              {items.length === 0 ? (
                <Text style={[styles.body, { marginTop: 10, opacity: 0.8 }]}>No items in this category.</Text>
              ) : (
                <View style={{ marginTop: 6 }}>
                  {items.map((i, idx) => {
                    const qty = cart[i.id] ?? 0;
                    return (
                      <View key={i.id} style={[styles.rowCard, idx !== 0 && { marginTop: 12 }]}>
                        {/* Left text */}
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={styles.itemName}>{i.name}</Text>
                          {!!i.description && (
                            <Text style={styles.itemDesc} numberOfLines={2}>
                              {i.description}
                            </Text>
                          )}
                          <Text style={styles.itemPrice}>R{i.price}</Text>

                          {/* Qty controls */}
                          <View style={styles.qtyRow}>
                            <Pressable onPress={() => adjust(i.id, -1)} style={styles.qtyBtnDark}>
                              <Text style={styles.qtyBtnTextWhite}>-</Text>
                            </Pressable>

                            <View style={styles.qtyPill}>
                              <Text style={styles.qtyPillText}>{qty}</Text>
                            </View>

                            <Pressable onPress={() => adjust(i.id, +1)} style={styles.qtyBtnGold}>
                              <Text style={styles.qtyBtnTextDark}>+</Text>
                            </Pressable>
                          </View>
                        </View>

                        {/* Right square image */}
                        <View style={styles.thumbWrap}>
                          {i.imageUrl ? (
                            <Image source={{ uri: i.imageUrl }} style={styles.thumbImg} resizeMode="cover" />
                          ) : (
                            <View style={styles.thumbSkeleton} />
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Cart bar */}
      <View style={styles.cartBar}>
        <View style={styles.cartContainer}>
          <Pressable
            disabled={!cartCount}
            onPress={() =>
              router.push({
                pathname: "/(customer)/cart",
                params: {
                  venueId,
                  tableId,
                  restaurantId,
                  cart: JSON.stringify(cartList),
                  subtotal: String(subtotal),
                },
              })
            }
            style={[styles.cartBtn, !cartCount && { opacity: 0.55 }]}
          >
            <Text style={styles.cartBtnText}>
              View Cart • {cartCount} items • R{subtotal}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  container: { width: "100%", maxWidth: 520, alignSelf: "center" },

  headerRow: { flexDirection: "row", alignItems: "center" },
  logoWrap: { marginRight: 12 },
  logoImg: {
    width: 54,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: "#0d1f17",
  },
  logoFallback: {
    width: 54,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: "#0d1f17",
    alignItems: "center",
    justifyContent: "center",
  },
  logoFallbackText: { color: theme.colors.goldSoft, fontWeight: "900", fontSize: 18 },

  title: { fontSize: 22, fontWeight: "900", color: "white" },
  subTitle: { color: "rgba(255,255,255,0.75)", marginTop: 4, fontWeight: "700" },
  body: { color: "white", fontSize: 14 },

  // ✅ Top row: table pill left, status button right
  topRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  statusBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.gold,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
  },
  statusBtnText: { fontWeight: "900", color: "#111" },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: "transparent",
  },
  chipActive: { backgroundColor: theme.colors.gold },
  chipText: { fontWeight: "900", color: theme.colors.goldSoft },
  chipTextActive: { color: "#111" },

  rowCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
    flexDirection: "row",
    alignItems: "center",
  },

  itemName: { color: "white", fontWeight: "900", fontSize: 16 },
  itemDesc: { color: "rgba(255,255,255,0.75)", marginTop: 6, lineHeight: 18 },
  itemPrice: { color: theme.colors.goldSoft, fontWeight: "900", marginTop: 10 },

  qtyRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  qtyBtnDark: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#0d1f17" },
  qtyBtnGold: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: theme.colors.gold },
  qtyBtnTextWhite: { color: "white", fontWeight: "900", fontSize: 16 },
  qtyBtnTextDark: { color: "#111", fontWeight: "900", fontSize: 16 },

  qtyPill: {
    marginHorizontal: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    minWidth: 44,
    alignItems: "center",
  },
  qtyPillText: { color: "white", fontWeight: "900" },

  thumbWrap: {
    width: 86,
    height: 86,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbSkeleton: { width: "100%", height: "100%", backgroundColor: "#0d1f17", opacity: 0.65 },

  cartBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0d1f17",
    borderTopWidth: 1,
    borderTopColor: theme.colors.gold,
    padding: 14,
  },
  cartContainer: { width: "100%", maxWidth: 520, alignSelf: "center" },
  cartBtn: { padding: 16, borderRadius: 16, backgroundColor: theme.colors.gold },
  cartBtnText: { fontWeight: "900", textAlign: "center", color: "#111" },
});
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  Timestamp,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { refs } from "../../src/lib/firestoreRefs";
import { theme } from "../../src/ui/theme";

type Order = {
  id: string;
  venueId: string;
  restaurantId: string;
  restaurantName?: string;
  status: string;

  createdAt?: Timestamp;
  deliveredAt?: Timestamp | null;

  // Optional: if you later add feedback
  satisfaction?: "positive" | "neutral" | "negative" | null;
  rating?: number | null; // e.g. 1,0,-1
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function tsToDate(ts?: Timestamp | null): Date | null {
  if (!ts) return null;
  try {
    return ts.toDate();
  } catch {
    return null;
  }
}

function minutesBetween(a: Date | null, b: Date | null) {
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 60000);
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function hourLabel(h: number) {
  return `${pad2(h)}:00`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function VenueAnalyticsScreen() {
  // Optional venueId via params; fallback to your seeded venue
  const { venueId: venueIdParam } = useLocalSearchParams<{ venueId?: string }>();
  const venueId = venueIdParam || "venue_golfbar_cs";

  const { width } = useWindowDimensions();
  const hPad = useMemo(() => (width < 380 ? 16 : 24), [width]);

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Live orders for today (venue scoped)
  useEffect(() => {
    setLoading(true);
    setError(null);

    const start = Timestamp.fromDate(startOfToday());

    const q = query(
      refs.orders(),
      where("venueId", "==", venueId),
      where("createdAt", ">=", start),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Order[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setOrders(rows);
        setLoading(false);
      },
      (err) => {
        console.log(err);
        setError(err?.message ?? "Failed to load analytics");
        setLoading(false);
      }
    );

    return unsub;
  }, [venueId]);

  // ===== Derived metrics =====
  const ordersToday = orders.length;

  const activeRestaurants = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) set.add(o.restaurantId);
    return set.size;
  }, [orders]);

  const fulfillmentMinutesList = useMemo(() => {
    const mins: number[] = [];
    for (const o of orders) {
      const created = tsToDate(o.createdAt);
      const delivered = tsToDate(o.deliveredAt) || (o.status === "DELIVERED" ? tsToDate((o as any).updatedAt) : null);
      const m = minutesBetween(created, delivered);
      if (m != null) mins.push(m);
    }
    return mins;
  }, [orders]);

  const avgFulfillment = useMemo(() => {
    if (fulfillmentMinutesList.length === 0) return null;
    const sum = fulfillmentMinutesList.reduce((a, b) => a + b, 0);
    return Math.round(sum / fulfillmentMinutesList.length);
  }, [fulfillmentMinutesList]);

  const peakHour = useMemo(() => {
    // peak based on createdAt
    const buckets: Record<number, number> = {};
    for (const o of orders) {
      const d = tsToDate(o.createdAt);
      if (!d) continue;
      const h = d.getHours();
      buckets[h] = (buckets[h] ?? 0) + 1;
    }
    let bestH: number | null = null;
    let bestC = -1;
    for (const [hStr, c] of Object.entries(buckets)) {
      const h = Number(hStr);
      if (c > bestC) {
        bestC = c;
        bestH = h;
      }
    }
    if (bestH == null) return null;
    return `${hourLabel(bestH)}–${hourLabel((bestH + 1) % 24)}`;
  }, [orders]);

  const restaurantStats = useMemo(() => {
    type Agg = {
      restaurantId: string;
      restaurantName: string;
      count: number;
      deliveredCount: number;
      avgMins: number | null;
      efficiency: number | null; // % delivered within target
    };

    const by: Record<string, { name: string; times: number[]; deliveredWithinTarget: number; delivered: number; total: number }> =
      {};

    for (const o of orders) {
      const rid = o.restaurantId;
      if (!by[rid]) {
        by[rid] = {
          name: o.restaurantName ?? rid,
          times: [],
          deliveredWithinTarget: 0,
          delivered: 0,
          total: 0,
        };
      }
      by[rid].total += 1;

      const created = tsToDate(o.createdAt);
      const delivered = tsToDate(o.deliveredAt) || (o.status === "DELIVERED" ? tsToDate((o as any).updatedAt) : null);
      const m = minutesBetween(created, delivered);
      if (m != null) {
        by[rid].times.push(m);
        by[rid].delivered += 1;

        // efficiency target (demo): delivered within 20 mins
        if (m <= 20) by[rid].deliveredWithinTarget += 1;
      }
    }

    const stats: Agg[] = Object.entries(by).map(([rid, v]) => {
      const avg =
        v.times.length > 0 ? Math.round(v.times.reduce((a, b) => a + b, 0) / v.times.length) : null;
      const eff =
        v.delivered > 0 ? Math.round((v.deliveredWithinTarget / v.delivered) * 100) : null;

      return {
        restaurantId: rid,
        restaurantName: v.name,
        count: v.total,
        deliveredCount: v.delivered,
        avgMins: avg,
        efficiency: eff,
      };
    });

    // Sort by order volume desc
    stats.sort((a, b) => b.count - a.count);

    return stats;
  }, [orders]);

  const satisfaction = useMemo(() => {
    // If you have real feedback later, we’ll use it.
    // Accepted formats:
    // - order.satisfaction: "positive" | "neutral" | "negative"
    // - order.rating: 1 / 0 / -1
    let pos = 0;
    let neu = 0;
    let neg = 0;

    for (const o of orders) {
      if (o.satisfaction) {
        if (o.satisfaction === "positive") pos += 1;
        else if (o.satisfaction === "neutral") neu += 1;
        else if (o.satisfaction === "negative") neg += 1;
      } else if (typeof o.rating === "number") {
        if (o.rating > 0) pos += 1;
        else if (o.rating === 0) neu += 1;
        else neg += 1;
      }
    }

    const total = pos + neu + neg;
    if (total === 0) return null;

    return {
      posPct: Math.round((pos / total) * 100),
      neuPct: Math.round((neu / total) * 100),
      negPct: Math.round((neg / total) * 100),
      total,
    };
  }, [orders]);

  const throughput = useMemo(() => {
    // Build hourly counts for today (0–23), then show recent window
    const counts = new Array(24).fill(0) as number[];
    for (const o of orders) {
      const d = tsToDate(o.createdAt);
      if (!d) continue;
      counts[d.getHours()] += 1;
    }

    const now = new Date();
    const endHour = now.getHours();
    const window = 6; // last 6 hours
    const startHour = clamp(endHour - (window - 1), 0, 23);

    const rows = [];
    for (let h = startHour; h <= endHour; h++) {
      rows.push({ hour: h, count: counts[h] });
    }

    const max = Math.max(1, ...rows.map((r) => r.count));
    return { rows, max };
  }, [orders]);

  // ===== UI =====
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: hPad, paddingTop: 18, paddingBottom: 28 },
        ]}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Venue Analytics</Text>
              <Text style={styles.sub}>Golf Bar ops visibility • Live from Firestore</Text>
            </View>

            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.92 }]}
            >
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          </View>

          <Text style={styles.venueLine}>Venue: {venueId}</Text>

          {/* Loading / error */}
          {loading ? (
            <View style={{ marginTop: 22 }}>
              <ActivityIndicator color={theme.colors.gold} />
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Couldn’t load analytics</Text>
              <Text style={styles.errorBody}>{error}</Text>
              <Text style={styles.errorBody}>
                Tip: ensure Firestore composite index exists for venueId + createdAt.
              </Text>
            </View>
          ) : (
            <>
              {/* Section A — Performance Overview */}
              <Text style={styles.sectionTitle}>Performance overview</Text>

              <View style={styles.grid}>
                <MetricCard label="Orders today" value={String(ordersToday)} />
                <MetricCard
                  label="Avg fulfillment"
                  value={avgFulfillment == null ? "—" : `${avgFulfillment} min`}
                />
                <MetricCard label="Peak hour" value={peakHour ?? "—"} />
                <MetricCard label="Active restaurants" value={String(activeRestaurants)} />
              </View>

              {/* Section B — Restaurant performance */}
              <Text style={styles.sectionTitle}>Restaurant performance</Text>

              {restaurantStats.length === 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardBody}>No orders yet today.</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {restaurantStats.slice(0, 5).map((r) => (
                    <View key={r.restaurantId} style={styles.card}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={styles.cardTitle}>{r.restaurantName}</Text>
                        <Text style={styles.badge}>{r.count} orders</Text>
                      </View>

                      <View style={{ height: 10 }} />

                      <View style={styles.row}>
                        <Text style={styles.kvKey}>Avg time</Text>
                        <Text style={styles.kvVal}>{r.avgMins == null ? "—" : `${r.avgMins} min`}</Text>
                      </View>

                      <View style={styles.row}>
                        <Text style={styles.kvKey}>Delivered</Text>
                        <Text style={styles.kvVal}>{r.deliveredCount}</Text>
                      </View>

                      <View style={styles.row}>
                        <Text style={styles.kvKey}>Efficiency</Text>
                        <Text style={styles.kvVal}>
                          {r.efficiency == null ? "—" : `${r.efficiency}%`}
                        </Text>
                      </View>

                      <Text style={styles.smallNote}>
                        Efficiency = % delivered within 20 minutes (demo target).
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Section C — Customer satisfaction */}
              <Text style={styles.sectionTitle}>Customer satisfaction</Text>

              {satisfaction ? (
                <View style={styles.card}>
                  <View style={styles.row}>
                    <Text style={styles.kvKey}>Positive</Text>
                    <Text style={styles.kvVal}>{satisfaction.posPct}%</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.kvKey}>Neutral</Text>
                    <Text style={styles.kvVal}>{satisfaction.neuPct}%</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.kvKey}>Negative</Text>
                    <Text style={styles.kvVal}>{satisfaction.negPct}%</Text>
                  </View>
                  <Text style={styles.smallNote}>Based on {satisfaction.total} feedback entries.</Text>
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Demo baseline</Text>
                  <Text style={styles.cardBody}>
                    Feedback capture not enabled yet. We’ll add a 1-tap rating after delivery.
                  </Text>

                  <View style={{ height: 10 }} />
                  <View style={styles.row}>
                    <Text style={styles.kvKey}>Positive</Text>
                    <Text style={styles.kvVal}>91%</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.kvKey}>Neutral</Text>
                    <Text style={styles.kvVal}>6%</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.kvKey}>Negative</Text>
                    <Text style={styles.kvVal}>3%</Text>
                  </View>
                </View>
              )}

              {/* Section D — Throughput graph */}
              <Text style={styles.sectionTitle}>Live throughput</Text>
              <View style={styles.card}>
                {throughput.rows.map((r) => {
                  const pct = (r.count / throughput.max) * 100;
                  return (
                    <View key={r.hour} style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={styles.thLabel}>{hourLabel(r.hour)}</Text>
                        <Text style={styles.thCount}>{r.count}</Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                  );
                })}
                <Text style={styles.smallNote}>
                  Shows order volume per hour for the last 6 hours (today).
                </Text>
              </View>

              <Text style={styles.footer}>
                Tip: For the pitch, open this page while orders are flowing — it “sells itself”.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  container: { width: "100%", maxWidth: 700, alignSelf: "center" },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { color: "white", fontSize: 26, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.75)", marginTop: 6, fontWeight: "700" },
  venueLine: { color: "rgba(255,255,255,0.6)", marginTop: 8, fontWeight: "800" },

  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  backText: { color: "white", fontWeight: "900" },

  sectionTitle: { color: "white", fontSize: 18, fontWeight: "900", marginTop: 18, marginBottom: 10 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: {
    flexGrow: 1,
    minWidth: 150,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  metricLabel: { color: "rgba(255,255,255,0.75)", fontWeight: "900" },
  metricValue: { color: "white", fontSize: 20, fontWeight: "900", marginTop: 10 },

  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "900" },
  cardBody: { color: "rgba(255,255,255,0.78)", marginTop: 8, lineHeight: 20, fontWeight: "700" },

  badge: {
    color: "#111",
    fontWeight: "900",
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },

  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  kvKey: { color: "rgba(255,255,255,0.75)", fontWeight: "900" },
  kvVal: { color: "white", fontWeight: "900" },

  thLabel: { color: "rgba(255,255,255,0.75)", fontWeight: "900" },
  thCount: { color: "white", fontWeight: "900" },
  barTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
    marginTop: 8,
  },
  barFill: {
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.gold,
  },

  smallNote: { color: "rgba(255,255,255,0.55)", marginTop: 10, fontWeight: "700", fontSize: 12 },

  errorCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#331a1a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  errorTitle: { color: "white", fontSize: 16, fontWeight: "900" },
  errorBody: { color: "rgba(255,255,255,0.75)", marginTop: 8, fontWeight: "700", lineHeight: 18 },

  footer: { color: "rgba(255,255,255,0.55)", marginTop: 16, fontWeight: "700", fontSize: 12, lineHeight: 18 },
});
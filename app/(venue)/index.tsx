import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  SafeAreaView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { listenVenueOrders } from "../../src/domain/orders/orderQueries";
import { listRestaurantsForVenue } from "../../src/domain/restaurants/restaurantQueries";
import { updateOrderStatus } from "../../src/domain/orders/orderMutations";
import { timeAgoFromTimestamp } from "../../src/ui/time";
import { theme } from "../../src/ui/theme";

type TabKey = "RUNNER" | "BOARD" | "DELIVERED";
type Flow = "Optimal" | "Busy" | "Attention";

function GoldBadge({ text }: { text: string }) {
  return (
    <View style={styles.badgeGold}>
      <Text style={styles.badgeGoldText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function DarkPill({ text }: { text: string }) {
  return (
    <View style={styles.pillDark}>
      <Text style={styles.pillDarkText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function StatusChip({ status }: { status: string }) {
  const bg =
    status === "PLACED"
      ? "rgba(255, 215, 0, 0.16)"
      : status === "ACCEPTED"
      ? "rgba(255, 215, 0, 0.24)"
      : status === "PREPARING"
      ? "rgba(255, 255, 255, 0.10)"
      : status === "READY"
      ? "rgba(255, 215, 0, 0.34)"
      : status === "DELIVERED"
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(255,255,255,0.08)";

  const text = status === "READY" ? "READY" : status === "PLACED" ? "NEW" : status;

  return (
    <View style={[styles.statusChip, { backgroundColor: bg }]}>
      <Text style={styles.statusChipText}>{text}</Text>
    </View>
  );
}

// ---- Live stats helpers ----
function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  return null;
}

function minutesBetween(a: Date | null, b: Date | null) {
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 60000);
}

function flowLabel(active: number, ready: number, placed: number): Flow {
  if (ready >= 5 || placed >= 6) return "Attention";
  if (active >= 8) return "Busy";
  return "Optimal";
}

function flowCardStyle(flow: Flow) {
  // Subtle, premium — not “gaming neon”
  switch (flow) {
    case "Optimal":
      return {
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderColor: "rgba(255, 255, 255, 0.14)",
      };
    case "Busy":
      return {
        backgroundColor: "rgba(255, 215, 0, 0.10)",
        borderColor: "rgba(255, 215, 0, 0.22)",
      };
    case "Attention":
      return {
        backgroundColor: "rgba(255, 215, 0, 0.18)",
        borderColor: "rgba(255, 215, 0, 0.34)",
      };
  }
}

export default function VenueDashboard() {
  const venueId = "venue_golfbar_cs";

  const { width } = useWindowDimensions();
  const hPad = useMemo(() => (width < 380 ? 16 : 24), [width]);

  const [tab, setTab] = useState<TabKey>("RUNNER");
  const [orders, setOrders] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenVenueOrders(venueId, setOrders);
    return unsub;
  }, []);

  // Optional fallback map (older orders might not have restaurantName)
  const [restaurantMap, setRestaurantMap] = useState<Record<string, string>>({});
  useEffect(() => {
    let mounted = true;
    (async () => {
      const rs: any[] = await listRestaurantsForVenue(venueId);
      if (!mounted) return;
      const map: Record<string, string> = {};
      rs.forEach((r: any) => (map[r.id] = r.name));
      setRestaurantMap(map);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const sorted = useMemo(() => {
    const copy = [...orders];
    copy.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    return copy.map((o) => ({
      ...o,
      restaurantName: o.restaurantName ?? restaurantMap[o.restaurantId] ?? o.restaurantId,
      createdLabel: timeAgoFromTimestamp(o.createdAt),
    }));
  }, [orders, restaurantMap]);

  const groups = useMemo(() => {
    const g = {
      READY: [] as any[],
      PREPARING: [] as any[],
      ACCEPTED: [] as any[],
      PLACED: [] as any[],
      DELIVERED: [] as any[],
    };

    for (const o of sorted) {
      if (o.status === "READY") g.READY.push(o);
      else if (o.status === "PREPARING") g.PREPARING.push(o);
      else if (o.status === "ACCEPTED") g.ACCEPTED.push(o);
      else if (o.status === "PLACED") g.PLACED.push(o);
      else if (o.status === "DELIVERED") g.DELIVERED.push(o);
    }

    return g;
  }, [sorted]);

  const runnerList = groups.READY;
  const deliveredList = groups.DELIVERED;

  // ✅ Live status header (real-time from existing orders state)
  const live = useMemo(() => {
    const active = sorted.filter((o) => o.status !== "DELIVERED").length;
    const ready = groups.READY.length;
    const placed = groups.PLACED.length;

    // Avg fulfillment (delivered only). Prefer deliveredAt, fallback updatedAt.
    const mins: number[] = [];
    for (const o of sorted) {
      if (o.status !== "DELIVERED") continue;

      const created = tsToDate(o.createdAt);
      const delivered = tsToDate(o.deliveredAt) || tsToDate(o.updatedAt);
      const m = minutesBetween(created, delivered);
      if (m != null) mins.push(m);
    }

    const avg = mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : null;

    const flow = flowLabel(active, ready, placed);

    return { active, ready, avgFulfillment: avg, flow };
  }, [sorted, groups]);

  const TabButton = ({ k, label }: { k: TabKey; label: string }) => {
    const active = tab === k;
    return (
      <Pressable
        onPress={() => setTab(k)}
        style={({ pressed }) => [
          styles.tabBtn,
          active ? styles.tabBtnActive : styles.tabBtnInactive,
          pressed && { opacity: 0.92 },
        ]}
      >
        <Text style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextInactive]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const markDelivered = async (orderId: string) => {
    try {
      setBusyId(orderId);
      await updateOrderStatus(orderId, "DELIVERED");
    } catch (e: any) {
      console.log(e);
      Alert.alert("Update failed", e?.message ?? "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const OrderCard = ({ o, showAction }: { o: any; showAction?: boolean }) => {
    const disabled = busyId === o.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Table {o.tableId}</Text>
            <Text style={styles.cardMeta}>{o.createdLabel}</Text>
          </View>
          <StatusChip status={o.status} />
        </View>

        <View style={styles.badgeRow}>
          <GoldBadge text={o.restaurantName} />
          <DarkPill text={`R${o.subtotal}`} />
          <DarkPill text="In-venue delivery" />
        </View>

        {showAction && o.status === "READY" && (
          <Pressable
            disabled={disabled}
            onPress={() => markDelivered(o.id)}
            style={({ pressed }) => [
              styles.primaryBtn,
              disabled && { opacity: 0.55 },
              pressed && !disabled && { opacity: 0.92 },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {disabled ? "Updating..." : "Mark Delivered"}
            </Text>
          </Pressable>
        )}

        <Text style={styles.orderId}>Order: {o.id}</Text>
      </View>
    );
  };

  const Section = ({ title, list }: { title: string; list: any[] }) => (
    <View style={{ gap: 10, marginTop: 14 }}>
      <Text style={styles.sectionTitle}>
        {title} <Text style={{ opacity: 0.75 }}>({list.length})</Text>
      </Text>

      {list.length === 0 ? (
        <Text style={styles.emptyText}>None</Text>
      ) : (
        <View style={{ gap: 12 }}>
          {list.map((o) => (
            <OrderCard key={o.id} o={o} />
          ))}
        </View>
      )}
    </View>
  );

  const flowStyle = flowCardStyle(live.flow);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: hPad, paddingTop: 18, paddingBottom: 28 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hTitle}>GOLF BAR</Text>
              <Text style={styles.hSub}>Venue Ops • Not a kitchen • Live order flow</Text>
            </View>

            <Pressable
              onPress={() => router.push({ pathname: "/(venue)/analytics", params: { venueId } })}
              style={({ pressed }) => [styles.analyticsBtn, pressed && { opacity: 0.92 }]}
            >
              <Text style={styles.analyticsBtnText}>Analytics</Text>
            </Pressable>
          </View>

          <Text style={styles.venueLine}>Venue: {venueId}</Text>

          {/* ✅ Live status header */}
          <View style={styles.liveWrap}>
            <View style={[styles.liveCard, flowStyle]}>
              <Text style={styles.liveLabel}>Flow</Text>
              <Text style={styles.liveValue}>{live.flow}</Text>
              <Text style={styles.liveHint}>
                {live.flow === "Optimal"
                  ? "Stable"
                  : live.flow === "Busy"
                  ? "Watch runner load"
                  : "Runner attention needed"}
              </Text>
            </View>

            <View style={styles.liveCard}>
              <Text style={styles.liveLabel}>Active orders</Text>
              <Text style={styles.liveValue}>{live.active}</Text>
              <Text style={styles.liveHint}>Not delivered</Text>
            </View>

            <View style={styles.liveCard}>
              <Text style={styles.liveLabel}>Runner ready</Text>
              <Text style={styles.liveValue}>{live.ready}</Text>
              <Text style={styles.liveHint}>Needs delivery</Text>
            </View>

            <View style={styles.liveCard}>
              <Text style={styles.liveLabel}>Avg fulfillment</Text>
              <Text style={styles.liveValue}>
                {live.avgFulfillment == null ? "—" : `${live.avgFulfillment} min`}
              </Text>
              <Text style={styles.liveHint}>Today (delivered)</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            <TabButton k="RUNNER" label={`Runner (${runnerList.length})`} />
            <TabButton k="BOARD" label="Ops Board" />
            <TabButton k="DELIVERED" label={`Delivered (${deliveredList.length})`} />
          </View>

          {/* Runner view */}
          {tab === "RUNNER" && (
            <View style={{ gap: 12, marginTop: 12 }}>
              {runnerList.length === 0 ? (
                <Text style={styles.emptyText}>No READY orders right now.</Text>
              ) : (
                runnerList.map((o) => <OrderCard key={o.id} o={o} showAction />)
              )}
            </View>
          )}

          {/* Board view */}
          {tab === "BOARD" && (
            <>
              <Section title="READY (handoff)" list={groups.READY} />
              <Section title="PREPARING" list={groups.PREPARING} />
              <Section title="ACCEPTED" list={groups.ACCEPTED} />
              <Section title="PLACED (new)" list={groups.PLACED} />
            </>
          )}

          {/* Delivered view */}
          {tab === "DELIVERED" && (
            <View style={{ gap: 12, marginTop: 12 }}>
              {deliveredList.length === 0 ? (
                <Text style={styles.emptyText}>No delivered orders yet.</Text>
              ) : (
                deliveredList.map((o) => <OrderCard key={o.id} o={o} />)
              )}
            </View>
          )}

          <View style={styles.ruleBox}>
            <Text style={styles.ruleTitle}>Ops rule</Text>
            <Text style={styles.ruleBody}>
              Kitchen owns <Text style={styles.ruleStrong}>PLACED → READY</Text>. Venue owns{" "}
              <Text style={styles.ruleStrong}>READY → DELIVERED</Text>.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", maxWidth: 700, alignSelf: "center" },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  hTitle: { color: "white", fontSize: 26, fontWeight: "900", letterSpacing: 0.6 },
  hSub: { color: "rgba(255,255,255,0.75)", marginTop: 6, fontWeight: "800" },
  venueLine: { color: "rgba(255,255,255,0.6)", marginTop: 10, fontWeight: "800" },

  analyticsBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.gold,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
  },
  analyticsBtnText: { color: "#111", fontWeight: "900" },

  liveWrap: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  liveCard: {
    flexGrow: 1,
    minWidth: 150,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  liveLabel: { color: "rgba(255,255,255,0.65)", fontWeight: "900" },
  liveValue: { color: "white", fontSize: 18, fontWeight: "900", marginTop: 8 },
  liveHint: { color: "rgba(255,255,255,0.55)", fontWeight: "800", marginTop: 6, fontSize: 12 },

  tabsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },

  tabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.gold,
    borderColor: "rgba(0,0,0,0.12)",
  },
  tabBtnInactive: {
    backgroundColor: "#0d1f17",
    borderColor: "rgba(255,255,255,0.14)",
  },
  tabText: { fontWeight: "900" },
  tabTextActive: { color: "#111" },
  tabTextInactive: { color: "white" },

  card: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: { color: "white", fontWeight: "900", fontSize: 16 },
  cardMeta: { color: "rgba(255,255,255,0.70)", marginTop: 6, fontWeight: "700" },

  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  statusChipText: { color: "white", fontWeight: "900" },

  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  badgeGold: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.gold,
    maxWidth: 220,
  },
  badgeGoldText: { color: "#111", fontWeight: "900" },

  pillDark: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    maxWidth: 220,
  },
  pillDarkText: { color: "white", fontWeight: "900" },

  primaryBtn: { paddingVertical: 12, borderRadius: 14, backgroundColor: theme.colors.gold },
  primaryBtnText: { color: "#111", fontWeight: "900", textAlign: "center" },

  orderId: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "700" },

  sectionTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  emptyText: { color: "rgba(255,255,255,0.65)", fontWeight: "700" },

  ruleBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  ruleTitle: { color: "white", fontWeight: "900", fontSize: 14 },
  ruleBody: { color: "rgba(255,255,255,0.75)", marginTop: 8, fontWeight: "700", lineHeight: 18 },
  ruleStrong: { color: "white", fontWeight: "900" },
});
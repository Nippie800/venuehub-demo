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
  Modal,
} from "react-native";
import { router } from "expo-router";
import { listenVenueOrders } from "../../src/domain/orders/orderQueries";
import { listRestaurantsForVenue } from "../../src/domain/restaurants/restaurantQueries";
import { updateOrderStatus } from "../../src/domain/orders/orderMutations";
import { timeAgoFromTimestamp } from "../../src/ui/time";
import { theme } from "../../src/ui/theme";
import { seedLoyaltyProfiles } from "../../src/dev/seedLoyaltyProfiles";

type TabKey = "RUNNER" | "BOARD" | "DELIVERED";
type Flow = "Optimal" | "Busy" | "Attention";

const DEV_MODE = true;

function StatusChip({ status }: { status: string }) {
  const bg =
    status === "PLACED"
      ? "rgba(255, 215, 0, 0.12)"
      : status === "ACCEPTED"
      ? "rgba(255, 215, 0, 0.18)"
      : status === "PREPARING"
      ? "rgba(255,255,255,0.08)"
      : status === "READY"
      ? "rgba(120, 214, 128, 0.18)"
      : status === "DELIVERED"
      ? "rgba(255,255,255,0.08)"
      : "rgba(255,255,255,0.08)";

  const color =
    status === "READY"
      ? "#9BE38B"
      : status === "PLACED"
      ? theme.colors.goldSoft
      : "rgba(255,255,255,0.9)";

  const text = status === "PLACED" ? "New" : status;

  return (
    <View style={[styles.statusChip, { backgroundColor: bg }]}>
      <Text style={[styles.statusChipText, { color }]}>{text}</Text>
    </View>
  );
}

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

function flowMeta(flow: Flow) {
  switch (flow) {
    case "Optimal":
      return {
        dot: "#84D44B",
        hint: "Stable — no intervention needed",
        borderColor: "rgba(132,212,75,0.22)",
        bg: "rgba(132,212,75,0.05)",
      };
    case "Busy":
      return {
        dot: theme.colors.goldSoft,
        hint: "Load building — monitor handoff speed",
        borderColor: "rgba(255,215,0,0.20)",
        bg: "rgba(255,215,0,0.05)",
      };
    case "Attention":
      return {
        dot: "#FF9C3A",
        hint: "Queue pressure rising — action recommended",
        borderColor: "rgba(255,156,58,0.22)",
        bg: "rgba(255,156,58,0.06)",
      };
  }
}

function getClockLabel() {
  const now = new Date();
  return now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: "gold" | "green" | "muted";
}) {
  const valueColor =
    accent === "gold"
      ? theme.colors.goldSoft
      : accent === "green"
      ? "#9BE38B"
      : "white";

  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

function MenuAction({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuAction, pressed && { opacity: 0.92 }]}>
      <Text style={styles.menuActionText}>{label}</Text>
    </Pressable>
  );
}

export default function VenueDashboard() {
  const venueId = "venue_golfbar_cs";
  const { width } = useWindowDimensions();
  const hPad = useMemo(() => (width < 380 ? 14 : 18), [width]);

  const [tab, setTab] = useState<TabKey>("RUNNER");
  const [orders, setOrders] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = listenVenueOrders(venueId, setOrders);
    return unsub;
  }, [venueId]);

  const [restaurantMap, setRestaurantMap] = useState<Record<string, string>>({});
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const rs: any[] = await listRestaurantsForVenue(venueId);
        if (!mounted) return;

        const map: Record<string, string> = {};
        rs.forEach((r: any) => {
          map[r.id] = r.name;
        });
        setRestaurantMap(map);
      } catch (e) {
        console.log(e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [venueId]);

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

  const live = useMemo(() => {
    const active = sorted.filter((o) => o.status !== "DELIVERED").length;
    const ready = groups.READY.length;
    const placed = groups.PLACED.length;

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

    return {
      active,
      ready,
      delivered: groups.DELIVERED.length,
      avgFulfillment: avg,
      flow,
    };
  }, [sorted, groups]);

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

  const flowInfo = flowMeta(live.flow);

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

  const OrderCard = ({ o, showAction }: { o: any; showAction?: boolean }) => {
    const disabled = busyId === o.id;

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderTitle}>
              Table {o.tableId}
              {o.boothLabel ? ` · ${o.boothLabel}` : ""}
            </Text>
            <Text style={styles.orderSub}>
              {o.restaurantName} · {Array.isArray(o.items) ? `${o.items.length} items` : "Order"}
            </Text>
          </View>

          <View style={styles.orderRightMeta}>
            <StatusChip status={o.status} />
            <Text style={styles.orderTime}>
              {tsToDate(o.updatedAt ?? o.createdAt)?.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }) ?? o.createdLabel}
            </Text>
          </View>
        </View>

        {showAction && o.status === "READY" ? (
          <Pressable
            disabled={disabled}
            onPress={() => markDelivered(o.id)}
            style={({ pressed }) => [
              styles.primaryActionBtn,
              disabled && { opacity: 0.6 },
              pressed && !disabled && { opacity: 0.92 },
            ]}
          >
            <Text style={styles.primaryActionBtnText}>
              {disabled ? "Updating..." : "Mark Delivered"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const Section = ({ title, list }: { title: string; list: any[] }) => (
    <View style={{ marginTop: 18 }}>
      <Text style={styles.sectionHeader}>
        {title} <Text style={{ color: "rgba(255,255,255,0.45)" }}>({list.length})</Text>
      </Text>

      {list.length === 0 ? (
        <Text style={styles.emptyStateText}>None</Text>
      ) : (
        <View style={{ gap: 10, marginTop: 12 }}>
          {list.map((o) => (
            <OrderCard key={o.id} o={o} />
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: hPad,
          paddingTop: 10,
          paddingBottom: 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <View style={styles.brandBlock}>
              <View style={styles.brandDot} />
              <View>
                <Text style={styles.brandTitle}>Golf Bar</Text>
                <Text style={styles.brandSub}>venue_golfbar_cs · Venue Ops</Text>
              </View>
            </View>

            <View style={styles.topBarActions}>
              <View style={styles.timePill}>
                <Text style={styles.timePillText}>{getClockLabel()}</Text>
              </View>

              <Pressable style={styles.exitBtn}>
                <Text style={styles.exitBtnText}>Exit</Text>
              </Pressable>

              <Pressable
                onPress={() => setMenuOpen(true)}
                style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.92 }]}
              >
                <Text style={styles.menuBtnText}>☰</Text>
              </Pressable>
            </View>
          </View>

          {/* Menu modal */}
          <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
            <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
              <View style={styles.menuSheet}>
                <Text style={styles.menuTitle}>Navigate</Text>

                <MenuAction
                  label="Analytics"
                  onPress={() => {
                    setMenuOpen(false);
                    router.push({ pathname: "/(venue)/analytics", params: { venueId } });
                  }}
                />
                <MenuAction
                  label="Bookings"
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/(venue)/bookings");
                  }}
                />
                <MenuAction
                  label="Leaderboard"
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/(venue)/leaderboard");
                  }}
                />
                <MenuAction
                  label="Insights"
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/(venue)/insights");
                  }}
                />

                {DEV_MODE && (
                  <>
                    <View style={styles.menuDivider} />
                    <MenuAction
                      label="Seed Booths"
                      onPress={() => {
                        setMenuOpen(false);
                        router.push("/(venue)/seed-booths");
                      }}
                    />
                    <MenuAction
                      label="Seed Loyalty Profiles"
                      onPress={async () => {
                        try {
                          await seedLoyaltyProfiles();
                          setMenuOpen(false);
                          Alert.alert("Done", "Loyalty profiles seeded.");
                        } catch (e) {
                          console.log(e);
                          Alert.alert("Seed failed", "Could not seed loyalty profiles.");
                        }
                      }}
                    />
                  </>
                )}
              </View>
            </Pressable>
          </Modal>

          {/* Secondary nav hint */}
          <View style={styles.softNavRow}>
            <Text style={styles.softNavText}>Runner view</Text>
            <Text style={styles.softNavText}>Bookings</Text>
            <Text style={styles.softNavText}>Insights</Text>
            <Text style={styles.softNavText}>Leaderboard</Text>
          </View>

          {/* Flow status */}
          <View
            style={[
              styles.flowCard,
              {
                backgroundColor: flowInfo.bg,
                borderColor: flowInfo.borderColor,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.flowLabel}>FLOW STATUS</Text>

              <View style={styles.flowStatusRow}>
                <View style={[styles.flowDot, { backgroundColor: flowInfo.dot }]} />
                <View>
                  <Text style={styles.flowTitle}>{live.flow}</Text>
                  <Text style={styles.flowHint}>{flowInfo.hint}</Text>
                </View>
              </View>
            </View>

            <View style={styles.flowRules}>
              <Text style={styles.flowRulesText}>Kitchen: Placed → Ready</Text>
              <Text style={styles.flowRulesText}>Venue: Ready → Delivered</Text>
            </View>
          </View>

          {/* KPI cards */}
          <View style={styles.statsWrap}>
            <StatCard label="ACTIVE ORDERS" value={String(live.active)} hint="Not delivered" />
            <StatCard label="RUNNER READY" value={String(live.ready)} hint="Needs delivery" accent="gold" />
            <StatCard label="DELIVERED TODAY" value={String(live.delivered)} hint="All fulfilled" accent="green" />
            <StatCard
              label="AVG FULFILLMENT"
              value={live.avgFulfillment == null ? "—" : `${live.avgFulfillment}m`}
              hint="Today (delivered)"
            />
          </View>

          {/* Live order queue header */}
          <View style={styles.queueHeader}>
            <Text style={styles.queueTitle}>LIVE ORDER QUEUE</Text>

            <View style={styles.tabsRow}>
              <TabButton k="RUNNER" label={`Runner (${runnerList.length})`} />
              <TabButton k="BOARD" label="Ops board" />
              <TabButton k="DELIVERED" label={`Delivered (${deliveredList.length})`} />
            </View>
          </View>

          {/* Queue content */}
          {tab === "RUNNER" && (
            <View style={styles.queueBody}>
              {runnerList.length === 0 ? (
                <View style={styles.emptyQueueCard}>
                  <Text style={styles.emptyQueueTitle}>No orders awaiting runner</Text>
                  <Text style={styles.emptyQueueSub}>All ready orders have been delivered</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {runnerList.map((o) => (
                    <OrderCard key={o.id} o={o} showAction />
                  ))}
                </View>
              )}
            </View>
          )}

          {tab === "BOARD" && (
            <View style={styles.queueBody}>
              <Section title="READY" list={groups.READY} />
              <Section title="PREPARING" list={groups.PREPARING} />
              <Section title="ACCEPTED" list={groups.ACCEPTED} />
              <Section title="PLACED" list={groups.PLACED} />
            </View>
          )}

          {tab === "DELIVERED" && (
            <View style={styles.queueBody}>
              <Text style={styles.sectionHeader}>DELIVERED ORDERS</Text>

              {deliveredList.length === 0 ? (
                <Text style={[styles.emptyStateText, { marginTop: 12 }]}>No delivered orders yet.</Text>
              ) : (
                <View style={{ gap: 10, marginTop: 12 }}>
                  {deliveredList.map((o, index) => (
                    <View key={o.id} style={styles.deliveredRowCard}>
                      <View style={styles.deliveredLeftRow}>
                        <Text style={styles.deliveredIndex}>#{String(deliveredList.length - index).padStart(2, "0")}</Text>
                        <View>
                          <Text style={styles.deliveredTitle}>
                            Table {o.tableId}
                            {o.boothLabel ? ` · ${o.boothLabel}` : ""}
                          </Text>
                          <Text style={styles.deliveredSub}>
                            {o.restaurantName} · {Array.isArray(o.items) ? `${o.items.length} items` : "Delivered"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.deliveredRightRow}>
                        <StatusChip status="DELIVERED" />
                        <Text style={styles.deliveredTime}>
                          {tsToDate(o.updatedAt ?? o.deliveredAt)?.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          }) ?? "—"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {DEV_MODE && (
            <View style={styles.devNote}>
              <Text style={styles.devNoteTitle}>Dev tools enabled</Text>
              <Text style={styles.devNoteBody}>
                Seed actions are temporary for demo prep. Remove or disable them before the final production handoff.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  brandBlock: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#6EBB2A",
    marginTop: 8,
  },
  brandTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
  },
  brandSub: {
    color: "rgba(255,255,255,0.44)",
    fontWeight: "700",
    marginTop: 2,
  },

  topBarActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  timePill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  timePillText: {
    color: "rgba(255,255,255,0.7)",
    fontWeight: "900",
    fontSize: 12,
  },
  exitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(138, 33, 24, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 87, 87, 0.22)",
  },
  exitBtnText: {
    color: "#FF705C",
    fontWeight: "900",
    fontSize: 12,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtnText: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
  },

  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 18,
  },
  menuSheet: {
    width: 230,
    borderRadius: 18,
    backgroundColor: "#0b1a13",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 12,
    gap: 8,
  },
  menuTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
    marginBottom: 4,
  },
  menuAction: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  menuActionText: {
    color: "white",
    fontWeight: "800",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 4,
  },

  softNavRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    marginTop: 14,
    marginBottom: 10,
  },
  softNavText: {
    color: "rgba(255,255,255,0.16)",
    fontWeight: "800",
    fontSize: 13,
  },

  flowCard: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  flowLabel: {
    color: "rgba(255,255,255,0.42)",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.7,
  },
  flowStatusRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  flowDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 6,
  },
  flowTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 26,
  },
  flowHint: {
    color: "rgba(255,255,255,0.52)",
    fontWeight: "700",
    marginTop: 4,
  },
  flowRules: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 180,
  },
  flowRulesText: {
    color: "rgba(255,255,255,0.46)",
    fontWeight: "700",
    textAlign: "right",
    lineHeight: 18,
  },

  statsWrap: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flexGrow: 1,
    minWidth: 180,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  statLabel: {
    color: "rgba(255,255,255,0.38)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8,
    lineHeight: 26,
  },
  statHint: {
    color: "rgba(255,255,255,0.46)",
    fontWeight: "700",
    marginTop: 4,
  },

  queueHeader: {
    marginTop: 18,
  },
  queueTitle: {
    color: "rgba(255,255,255,0.46)",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  tabsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    justifyContent: "flex-end",
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabBtnActive: {
    backgroundColor: "rgba(110, 187, 42, 0.14)",
    borderColor: "rgba(110, 187, 42, 0.24)",
  },
  tabBtnInactive: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
  },
  tabText: {
    fontWeight: "900",
    fontSize: 12,
  },
  tabTextActive: {
    color: "#9BE38B",
  },
  tabTextInactive: {
    color: "rgba(255,255,255,0.6)",
  },

  queueBody: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  emptyQueueCard: {
    paddingVertical: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyQueueTitle: {
    color: "rgba(255,255,255,0.34)",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyQueueSub: {
    color: "rgba(255,255,255,0.24)",
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },

  sectionHeader: {
    color: "rgba(255,255,255,0.46)",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  emptyStateText: {
    color: "rgba(255,255,255,0.42)",
    fontWeight: "700",
  },

  orderCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 12,
  },
  orderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  orderTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
  },
  orderSub: {
    color: "rgba(255,255,255,0.54)",
    fontWeight: "700",
    marginTop: 4,
  },
  orderRightMeta: {
    alignItems: "flex-end",
    gap: 8,
  },
  orderTime: {
    color: "rgba(255,255,255,0.36)",
    fontWeight: "700",
    fontSize: 12,
  },

  statusChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  statusChipText: {
    fontWeight: "900",
    fontSize: 12,
  },

  primaryActionBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.gold,
  },
  primaryActionBtnText: {
    color: "#111",
    fontWeight: "900",
    textAlign: "center",
  },

  deliveredRowCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  deliveredLeftRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    flex: 1,
    minWidth: 220,
  },
  deliveredIndex: {
    color: "rgba(255,255,255,0.32)",
    fontWeight: "900",
    fontSize: 22,
    minWidth: 42,
  },
  deliveredTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 18,
  },
  deliveredSub: {
    color: "rgba(255,255,255,0.5)",
    fontWeight: "700",
    marginTop: 4,
  },
  deliveredRightRow: {
    alignItems: "flex-end",
    gap: 8,
  },
  deliveredTime: {
    color: "rgba(255,255,255,0.4)",
    fontWeight: "700",
    fontSize: 12,
  },

  devNote: {
    marginTop: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,179,71,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,179,71,0.14)",
  },
  devNoteTitle: {
    color: theme.colors.goldSoft,
    fontWeight: "900",
    fontSize: 14,
  },
  devNoteBody: {
    color: "rgba(255,255,255,0.62)",
    marginTop: 8,
    fontWeight: "700",
    lineHeight: 18,
  },
});
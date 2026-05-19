import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { theme } from "../../src/ui/theme";
import {
  listLeaderboard,
  LoyaltyProfile,
} from "../../src/domain/loyalty/loyaltyQueries";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {!!hint && <Text style={styles.statHint}>{hint}</Text>}
    </View>
  );
}

function MetaBadge({
  text,
  gold = false,
}: {
  text: string;
  gold?: boolean;
}) {
  return (
    <View style={[styles.metaBadge, gold && styles.metaBadgeGold]}>
      <Text style={[styles.metaBadgeText, gold && styles.metaBadgeGoldText]}>
        {text}
      </Text>
    </View>
  );
}

function getLeagueTone(points: number) {
  if (points >= 3000) return "Crest";
  if (points >= 2250) return "Ascendant";
  if (points >= 1500) return "Trailblazer";
  if (points >= 1000) return "Legend";
  if (points >= 750) return "Master";
  if (points >= 400) return "Professional";
  if (points >= 270) return "Expert";
  if (points >= 50) return "Journeyman";
  return "Newcomer";
}

export default function VenueInsightsScreen() {
  const { width } = useWindowDimensions();
  const hPad = useMemo(() => (width < 380 ? 16 : 24), [width]);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LoyaltyProfile[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await listLeaderboard();
        if (!mounted) return;
        setRows(data);
      } catch (e) {
        console.log(e);
        Alert.alert("Load failed", "Could not load admin insights.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const totalCustomers = rows.length;
    const totalPoints = rows.reduce((sum, r) => sum + (r.totalPoints ?? 0), 0);
    const totalRewardsEarned = rows.reduce((sum, r) => sum + (r.rewardsEarned ?? 0), 0);

    const repeatCustomers = rows.filter((r) => (r.completedBookings ?? 0) >= 2).length;
    const repeatCustomerRate =
      totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

    const averagePointsPerCustomer =
      totalCustomers > 0 ? Math.round(totalPoints / totalCustomers) : 0;

    const topPlayers = [...rows].slice(0, 5);

    return {
      totalCustomers,
      totalPoints,
      totalRewardsEarned,
      repeatCustomers,
      repeatCustomerRate,
      averagePointsPerCustomer,
      topPlayers,
    };
  }, [rows]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: hPad,
          paddingTop: 18,
          paddingBottom: 28,
        }}
      >
        <View style={{ width: "100%", maxWidth: 860, alignSelf: "center" }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Admin Insights</Text>
              <Text style={styles.sub}>
                Loyalty performance, repeat customer health, and reward activity.
              </Text>
            </View>

            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.92 }]}
            >
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={{ marginTop: 24 }}>
              <ActivityIndicator color={theme.colors.gold} />
            </View>
          ) : (
            <>
              <View style={styles.heroStrip}>
                <Text style={styles.heroStripTitle}>Loyalty pulse</Text>
                <Text style={styles.heroStripSub}>
                  A quick view of how well the venue is turning visits into repeat engagement.
                </Text>
              </View>

              <View style={styles.statsGrid}>
                <StatCard
                  label="Top loyalty players"
                  value={String(metrics.topPlayers.length)}
                  hint="Top 5 shown below"
                />
                <StatCard
                  label="Total rewards earned"
                  value={String(metrics.totalRewardsEarned)}
                  hint="1 reward per 7 completed bookings"
                />
                <StatCard
                  label="Repeat customer rate"
                  value={`${metrics.repeatCustomerRate}%`}
                  hint={`${metrics.repeatCustomers} of ${metrics.totalCustomers} customers`}
                />
                <StatCard
                  label="Avg points per customer"
                  value={String(metrics.averagePointsPerCustomer)}
                  hint={`${metrics.totalPoints} total points awarded`}
                />
              </View>

              <Text style={styles.sectionTitle}>Top loyalty players</Text>

              {metrics.topPlayers.length === 0 ? (
                <Text style={styles.empty}>No loyalty profiles yet.</Text>
              ) : (
                <View style={{ gap: 12, marginTop: 12 }}>
                  {metrics.topPlayers.map((player, index) => (
                    <View key={player.id} style={styles.playerCard}>
                      <View style={styles.rankWrap}>
                        <Text style={styles.rankText}>#{index + 1}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.playerTop}>
                          <Text style={styles.playerName}>{player.customerName}</Text>
                          <MetaBadge text={player.currentLeague ?? getLeagueTone(player.totalPoints ?? 0)} gold={index === 0} />
                        </View>

                        <Text style={styles.playerEmail}>{player.customerEmail}</Text>

                        <View style={styles.metaRow}>
                          <MetaBadge text={`${player.totalPoints ?? 0} pts`} gold={index === 0} />
                          <MetaBadge text={`${player.completedBookings ?? 0} completed`} />
                          <MetaBadge text={`${player.rewardsEarned ?? 0} rewards`} />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.noteCard}>
                <Text style={styles.noteTitle}>How to read this</Text>
                <Text style={styles.noteText}>
                  Repeat customer rate measures how many loyalty members have completed at least
                  two bookings. Average points per customer shows how much value the system is
                  generating per active customer in the loyalty pool.
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: "white",
    fontSize: 26,
    fontWeight: "900",
  },
  sub: {
    color: "rgba(255,255,255,0.72)",
    marginTop: 6,
    fontWeight: "700",
    lineHeight: 20,
  },

  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  backBtnText: {
    color: "white",
    fontWeight: "900",
  },

  heroStrip: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  heroStripTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 16,
  },
  heroStripSub: {
    color: "rgba(255,255,255,0.68)",
    marginTop: 6,
    fontWeight: "700",
    lineHeight: 18,
  },

  statsGrid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flexGrow: 1,
    minWidth: 170,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  statLabel: {
    color: "rgba(255,255,255,0.68)",
    fontWeight: "800",
    fontSize: 12,
  },
  statValue: {
    color: "white",
    fontWeight: "900",
    fontSize: 28,
    marginTop: 8,
  },
  statHint: {
    color: "rgba(255,255,255,0.58)",
    fontWeight: "700",
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
  },

  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 20,
  },

  empty: {
    color: "rgba(255,255,255,0.72)",
    fontWeight: "700",
    marginTop: 12,
  },

  playerCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },

  rankWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    color: theme.colors.goldSoft,
    fontWeight: "900",
    fontSize: 16,
  },

  playerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  playerName: {
    color: "white",
    fontWeight: "900",
    fontSize: 17,
    flex: 1,
  },
  playerEmail: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 6,
    fontWeight: "700",
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  metaBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  metaBadgeGold: {
    backgroundColor: theme.colors.gold,
  },
  metaBadgeText: {
    color: "white",
    fontWeight: "900",
    fontSize: 12,
  },
  metaBadgeGoldText: {
    color: "#111",
    fontWeight: "900",
    fontSize: 12,
  },

  noteCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  noteTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },
  noteText: {
    color: "rgba(255,255,255,0.68)",
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 8,
  },
});
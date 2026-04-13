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

function TierChip({ tier }: { tier: string }) {
  const gold = tier === "GOLD";
  const silver = tier === "SILVER";

  const bg = gold
    ? theme.colors.gold
    : silver
    ? "rgba(255,255,255,0.18)"
    : "#0d1f17";

  const color = gold ? "#111" : "white";

  return (
    <View style={[styles.tierChip, { backgroundColor: bg }]}>
      <Text style={[styles.tierChipText, { color }]}>{tier}</Text>
    </View>
  );
}

export default function VenueLeaderboardScreen() {
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
        Alert.alert("Load failed", "Could not load leaderboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: hPad,
          paddingTop: 18,
          paddingBottom: 28,
        }}
      >
        <View style={{ width: "100%", maxWidth: 760, alignSelf: "center" }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Leaderboard</Text>
              <Text style={styles.sub}>
                Customer loyalty standings based on points and completed visits.
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
          ) : rows.length === 0 ? (
            <Text style={styles.empty}>No loyalty profiles yet.</Text>
          ) : (
            <View style={{ gap: 12, marginTop: 18 }}>
              {rows.map((r, index) => (
                <View key={r.id} style={styles.card}>
                  <View style={styles.rankWrap}>
                    <Text style={styles.rank}>#{index + 1}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle}>{r.customerName}</Text>
                      <TierChip tier={r.currentTier} />
                    </View>

                    <Text style={styles.cardSub}>{r.customerEmail}</Text>

                    <View style={styles.metaRow}>
                      <MetaBadge text={`${r.totalPoints} pts`} gold />
                      <MetaBadge text={`${r.totalVisits} visits`} />
                      <MetaBadge text={`${r.completedBookings} completed`} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { color: "white", fontSize: 26, fontWeight: "900" },
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
  backBtnText: { color: "white", fontWeight: "900" },

  empty: {
    color: "rgba(255,255,255,0.72)",
    fontWeight: "700",
    marginTop: 20,
  },

  card: {
    padding: 16,
    borderRadius: 18,
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
  rank: {
    color: theme.colors.goldSoft,
    fontWeight: "900",
    fontSize: 16,
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  cardTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 17,
    flex: 1,
  },
  cardSub: {
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

  tierChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  tierChipText: {
    fontWeight: "900",
    fontSize: 12,
  },
});
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
  Image,
  ImageSourcePropType,
} from "react-native";
import { router } from "expo-router";
import { theme } from "../../src/ui/theme";
import {
  listLeaderboard,
  LoyaltyProfile,
} from "../../src/domain/loyalty/loyaltyQueries";

type PodiumTone = "gold" | "silver" | "bronze" | "standard";
type RangeFilter = "ALL_TIME" | "THIS_MONTH" | "THIS_WEEK";

const BADGE_IMAGES: Record<Exclude<PodiumTone, "standard">, ImageSourcePropType> = {
  gold: require("../../assets/badges/gold-tier.png"),
  silver: require("../../assets/badges/silver-tier.png"),
  bronze: require("../../assets/badges/bronze-tier.png"),
};

function getPodiumTone(rank: number): PodiumTone {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "standard";
}

function hasHotStreak(profile: LoyaltyProfile) {
  return (profile.totalVisits ?? 0) >= 3 && (profile.totalPoints ?? 0) >= 50;
}

function getPodiumCardStyle(tone: PodiumTone) {
  switch (tone) {
    case "gold":
      return {
        backgroundColor: "#3a2a00",
        borderColor: "rgba(255,215,0,0.55)",
        accent: theme.colors.gold,
      };
    case "silver":
      return {
        backgroundColor: "#232735",
        borderColor: "rgba(255,255,255,0.20)",
        accent: "#D9DCE3",
      };
    case "bronze":
      return {
        backgroundColor: "#3a220f",
        borderColor: "rgba(205,127,50,0.45)",
        accent: "#CD7F32",
      };
    default:
      return {
        backgroundColor: "#1a3a2b",
        borderColor: theme.colors.gold,
        accent: theme.colors.goldSoft,
      };
  }
}

function initialsFromName(name?: string) {
  if (!name) return "GB";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "GB";
}

function avatarPalette(index: number) {
  const palettes = [
    { bg: "#DCE8FF", fg: "#3568B8", border: "#B8CBEF" },
    { bg: "#D8EFE8", fg: "#2F7A63", border: "#A9D8C9" },
    { bg: "#F7E0D6", fg: "#B65A30", border: "#E2B9A8" },
    { bg: "#DDE8C9", fg: "#5F7A2F", border: "#BFD0A0" },
    { bg: "#EFE2D0", fg: "#9B6B2F", border: "#D9C1A5" },
    { bg: "#E2DCF7", fg: "#6B57BE", border: "#C6BAEC" },
    { bg: "#F6D8E2", fg: "#B84C77", border: "#E4B2C4" },
    { bg: "#E4E4E4", fg: "#666666", border: "#D0D0D0" },
  ];
  return palettes[index % palettes.length];
}

function RangePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.rangePill, active && styles.rangePillActive]}
    >
      <Text style={[styles.rangePillText, active && styles.rangePillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function PodiumImage({ rank }: { rank: number }) {
  const tone = getPodiumTone(rank);
  if (tone === "standard") return null;

  return (
    <View style={styles.badgeImageWrap}>
      <Image source={BADGE_IMAGES[tone]} style={styles.badgeImage} resizeMode="contain" />
    </View>
  );
}

function LivePill() {
  return (
    <View style={styles.livePill}>
      <View style={styles.liveDot} />
      <Text style={styles.livePillText}>Live</Text>
    </View>
  );
}

export default function CustomerLeaderboardScreen() {
  const { width } = useWindowDimensions();
  const hPad = useMemo(() => (width < 380 ? 16 : 24), [width]);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LoyaltyProfile[]>([]);
  const [range, setRange] = useState<RangeFilter>("ALL_TIME");

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

  const standings = useMemo(() => {
    return rows;
  }, [rows, range]);

  const podium = useMemo(() => standings.slice(0, 3), [standings]);
  const rest = useMemo(() => standings.slice(3), [standings]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: hPad,
          paddingTop: 18,
          paddingBottom: 32,
        }}
      >
        <View style={styles.page}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Leaderboard</Text>
              <Text style={styles.sub}>Golf Bar — public rankings</Text>
            </View>

            <View style={styles.headerRight}>
              <LivePill />
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.92 }]}
              >
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={{ marginTop: 28 }}>
              <ActivityIndicator color={theme.colors.gold} />
            </View>
          ) : standings.length === 0 ? (
            <Text style={styles.empty}>No leaderboard data yet.</Text>
          ) : (
            <>
              <Text style={styles.sectionEyebrow}>PODIUM</Text>

              <View style={styles.podiumWrap}>
                {podium.map((player, index) => {
                  const rank = index + 1;
                  const tone = getPodiumTone(rank);
                  const styleTone = getPodiumCardStyle(tone);
                  const streak = hasHotStreak(player);

                  return (
                    <View
                      key={player.id}
                      style={[
                        styles.podiumCard,
                        {
                          backgroundColor: styleTone.backgroundColor,
                          borderColor: styleTone.borderColor,
                        },
                      ]}
                    >
                      <View style={styles.podiumTop}>
                        <View style={[styles.podiumRankBox, { borderColor: styleTone.accent }]}>
                          <Text style={[styles.podiumRankNum, { color: styleTone.accent }]}>
                            {rank}
                          </Text>
                          <Text style={[styles.podiumRankLabel, { color: styleTone.accent }]}>
                            {rank === 1 ? "LEADER" : "PODIUM"}
                          </Text>
                        </View>

                        <PodiumImage rank={rank} />
                      </View>

                      <View style={styles.podiumIdentity}>
                        <Text style={styles.podiumName} numberOfLines={1}>
                          {player.customerName}
                        </Text>
                      </View>

                      <View style={styles.podiumStatsRow}>
                        <View style={styles.podiumStatBlock}>
                          <Text style={styles.podiumStatValue}>
                            {(player.totalPoints ?? 0).toLocaleString()}
                          </Text>
                          <Text style={styles.podiumStatLabel}>PTS</Text>
                        </View>

                        <View style={styles.podiumDivider} />

                        <View style={styles.podiumStatBlock}>
                          <Text style={styles.podiumStatValue}>{player.totalVisits ?? 0}</Text>
                          <Text style={styles.podiumStatLabel}>VISITS</Text>
                        </View>

                        <View style={styles.podiumDivider} />

                        <View style={styles.podiumStatBlock}>
                          <Text style={styles.podiumStatValue}>{player.completedBookings ?? 0}</Text>
                          <Text style={styles.podiumStatLabel}>DONE</Text>
                        </View>

                        {streak && (
                          <View style={styles.streakPill}>
                            <Text style={styles.streakPillText}>Hot Streak</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.fullStandingsHeader}>
                <Text style={styles.sectionEyebrow}>FULL STANDINGS</Text>

                <View style={styles.rangeRow}>
                  <RangePill
                    label="All time"
                    active={range === "ALL_TIME"}
                    onPress={() => setRange("ALL_TIME")}
                  />
                  <RangePill
                    label="This month"
                    active={range === "THIS_MONTH"}
                    onPress={() => setRange("THIS_MONTH")}
                  />
                  <RangePill
                    label="This week"
                    active={range === "THIS_WEEK"}
                    onPress={() => setRange("THIS_WEEK")}
                  />
                </View>
              </View>

              <View style={styles.tableWrap}>
                {standings.map((player, index) => {
                  const rank = index + 1;
                  const palette = avatarPalette(index);
                  const streak = hasHotStreak(player);

                  return (
                    <View key={player.id} style={styles.rowCard}>
                      <View style={styles.rowRankWrap}>
                        <Text style={styles.rowRank}>{rank}</Text>
                      </View>

                      <View
                        style={[
                          styles.avatarWrap,
                          {
                            backgroundColor: palette.bg,
                            borderColor: palette.border,
                          },
                        ]}
                      >
                        <Text style={[styles.avatarText, { color: palette.fg }]}>
                          {initialsFromName(player.customerName)}
                        </Text>
                      </View>

                      <View style={styles.rowIdentity}>
                        <View style={styles.rowNameLine}>
                          <Text style={styles.rowName} numberOfLines={1}>
                            {player.customerName}
                          </Text>
                          {streak && <View style={styles.orangeDot} />}
                        </View>
                      </View>

                      <View style={styles.rowStatsRight}>
                        <Text style={styles.rowPoints}>
                          {(player.totalPoints ?? 0).toLocaleString()} pts
                        </Text>
                        <Text style={styles.rowMeta} numberOfLines={2}>
                          {player.totalVisits ?? 0} visits · {player.completedBookings ?? 0} done
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {rest.length > 0 && (
                <Text style={styles.footerHint}>
                  Rankings are sorted by total points first, then total visits.
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 10,
  },

  title: {
    color: "white",
    fontSize: 30,
    fontWeight: "900",
  },
  sub: {
    color: "rgba(255,255,255,0.72)",
    marginTop: 4,
    fontWeight: "700",
  },

  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(166, 211, 110, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(166, 211, 110, 0.25)",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#8BC34A",
  },
  livePillText: {
    color: "#B8E986",
    fontWeight: "900",
    fontSize: 12,
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

  empty: {
    color: "rgba(255,255,255,0.72)",
    fontWeight: "700",
    marginTop: 24,
  },

  sectionEyebrow: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 24,
  },

  podiumWrap: {
    marginTop: 12,
    gap: 12,
  },
  podiumCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  podiumTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    flexWrap: "wrap",
  },
  podiumRankBox: {
    width: 64,
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  podiumRankNum: {
    fontWeight: "900",
    fontSize: 22,
    lineHeight: 24,
  },
  podiumRankLabel: {
    marginTop: 4,
    fontWeight: "900",
    fontSize: 9,
    letterSpacing: 0.5,
  },

  badgeImageWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 0,
    alignSelf: "flex-end",
  },
  badgeImage: {
    width: "100%",
    height: "100%",
  },

  podiumIdentity: {
    marginTop: 8,
    gap: 4,
    maxWidth: "100%",
  },
  podiumName: {
    color: "white",
    fontWeight: "900",
    fontSize: 24,
    lineHeight: 26,
  },

  podiumStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  podiumStatBlock: {
    minWidth: 72,
    flexShrink: 1,
  },
  podiumStatValue: {
    color: "white",
    fontWeight: "900",
    fontSize: 20,
    lineHeight: 22,
  },
  podiumStatLabel: {
    color: "rgba(255,255,255,0.52)",
    fontWeight: "900",
    fontSize: 10,
    marginTop: 2,
  },
  podiumDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  streakPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,140,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,140,0,0.28)",
    maxWidth: "100%",
  },
  streakPillText: {
    color: "#FFB347",
    fontWeight: "900",
    fontSize: 12,
  },

  fullStandingsHeader: {
    marginTop: 18,
  },
  rangeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  rangePill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "#0d1f17",
  },
  rangePillActive: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.24)",
  },
  rangePillText: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "900",
  },
  rangePillTextActive: {
    color: "white",
  },

  tableWrap: {
    marginTop: 12,
    gap: 10,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#123122",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  rowRankWrap: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  rowRank: {
    color: "rgba(255,255,255,0.82)",
    fontWeight: "900",
    fontSize: 18,
  },

  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "900",
    fontSize: 15,
  },

  rowIdentity: {
    flex: 1,
    minWidth: 100,
  },
  rowNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowName: {
    color: "white",
    fontWeight: "900",
    fontSize: 17,
    flexShrink: 1,
  },
  orangeDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#FF9C3A",
  },

  rowStatsRight: {
    alignItems: "flex-end",
    minWidth: 110,
    maxWidth: 150,
  },
  rowPoints: {
    color: "white",
    fontWeight: "900",
    fontSize: 17,
    textAlign: "right",
  },
  rowMeta: {
    color: "rgba(255,255,255,0.68)",
    fontWeight: "700",
    marginTop: 2,
    fontSize: 12,
    textAlign: "right",
  },

  footerHint: {
    marginTop: 16,
    color: "rgba(255,255,255,0.56)",
    fontWeight: "700",
    fontSize: 12,
  },
});
import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  useWindowDimensions,
  Image,
  ImageSourcePropType,
} from "react-native";
import { router } from "expo-router";
import { theme } from "../../src/ui/theme";
import {
  getLoyaltyProfileByEmail,
  LoyaltyProfile,
} from "../../src/domain/loyalty/loyaltyQueries";
import { normalizeEmail } from "../../src/utils/identity";

type LeagueName =
  | "Newcomer"
  | "Journeyman"
  | "Expert"
  | "Professional"
  | "Master"
  | "Legend"
  | "Trailblazer"
  | "Ascendant"
  | "Crest";

const LEAGUE_BADGE_IMAGES: Partial<Record<LeagueName, ImageSourcePropType>> = {
  Crest: require("../../assets/badges/leagues/crest-badge-Photoroom.png"),
  Master: require("../../assets/badges/leagues/master-badge-Photoroom.png"),
  Ascendant: require("../../assets/badges/leagues/ascendant-badge-Photoroom.png"),
  Professional: require("../../assets/badges/leagues/professor-badge-Photoroom.png"),
  Trailblazer: require("../../assets/badges/leagues/trailblazer-badge-Photoroom.png"),
  Journeyman: require("../../assets/badges/leagues/journeyman-badge-Photoroom.png"),
  Expert: require("../../assets/badges/leagues/expert-badge-Photoroom.png"),
  Legend: require("../../assets/badges/leagues/legend-badge-Photoroom.png"),
 
};

function nextLeagueInfo(points: number) {
  if (points >= 3000) {
    return { nextLeague: "MAX", remaining: 0, progress: 1 };
  }
  if (points >= 2250) {
    return {
      nextLeague: "Crest",
      remaining: 3000 - points,
      progress: (points - 2250) / (3000 - 2250),
    };
  }
  if (points >= 1500) {
    return {
      nextLeague: "Ascendant",
      remaining: 2250 - points,
      progress: (points - 1500) / (2250 - 1500),
    };
  }
  if (points >= 1000) {
    return {
      nextLeague: "Trailblazer",
      remaining: 1500 - points,
      progress: (points - 1000) / (1500 - 1000),
    };
  }
  if (points >= 750) {
    return {
      nextLeague: "Legend",
      remaining: 1000 - points,
      progress: (points - 750) / (1000 - 750),
    };
  }
  if (points >= 400) {
    return {
      nextLeague: "Master",
      remaining: 750 - points,
      progress: (points - 400) / (750 - 400),
    };
  }
  if (points >= 270) {
    return {
      nextLeague: "Professional",
      remaining: 400 - points,
      progress: (points - 270) / (400 - 270),
    };
  }
  if (points >= 50) {
    return {
      nextLeague: "Expert",
      remaining: 270 - points,
      progress: (points - 50) / (270 - 50),
    };
  }
  return {
    nextLeague: "Journeyman",
    remaining: 50 - points,
    progress: points / 50,
  };
}

function getLeagueTone(league?: string) {
  switch (league) {
    case "Crest":
      return {
        bg: theme.colors.gold,
        color: "#111",
        border: "rgba(0,0,0,0.12)",
      };
    case "Ascendant":
      return {
        bg: "rgba(255,255,255,0.10)",
        color: "white",
        border: "rgba(255,255,255,0.14)",
      };
    case "Trailblazer":
      return {
        bg: "rgba(255,215,0,0.12)",
        color: theme.colors.goldSoft,
        border: "rgba(255,215,0,0.25)",
      };
    case "Legend":
      return {
        bg: "rgba(255,255,255,0.08)",
        color: "white",
        border: "rgba(255,255,255,0.12)",
      };
    case "Master":
      return {
        bg: "rgba(124,103,255,0.12)",
        color: "#d7caff",
        border: "rgba(124,103,255,0.22)",
      };
    case "Professional":
      return {
        bg: "rgba(255,255,255,0.08)",
        color: "white",
        border: "rgba(255,255,255,0.12)",
      };
    case "Expert":
      return {
        bg: "rgba(255,255,255,0.08)",
        color: "white",
        border: "rgba(255,255,255,0.12)",
      };
    case "Journeyman":
      return {
        bg: "rgba(255,255,255,0.08)",
        color: "white",
        border: "rgba(255,255,255,0.12)",
      };
    default:
      return {
        bg: "#0d1f17",
        color: "white",
        border: "rgba(255,255,255,0.12)",
      };
  }
}

function LeagueBadgeVisual({ league }: { league: LeagueName }) {
  const badgeImage = LEAGUE_BADGE_IMAGES[league];

  if (badgeImage) {
    return (
      <View style={styles.leagueVisualWrap}>
        <Image source={badgeImage} style={styles.leagueVisualImg} resizeMode="contain" />
      </View>
    );
  }

  const tone = getLeagueTone(league);

  return (
    <View style={[styles.fallbackLeagueBadge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Text style={[styles.fallbackLeagueBadgeText, { color: tone.color }]}>{league}</Text>
    </View>
  );
}

export default function CustomerLoyaltyScreen() {
  const { width } = useWindowDimensions();
  const hPad = useMemo(() => (width < 380 ? 16 : 24), [width]);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<LoyaltyProfile | null>(null);

  const progressMeta = useMemo(
    () => nextLeagueInfo(profile?.totalPoints ?? 0),
    [profile?.totalPoints]
  );

  const loadProfile = async () => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      Alert.alert("Missing email", "Enter the email used for your bookings.");
      return;
    }

    try {
      setLoading(true);
      const data = await getLoyaltyProfileByEmail(normalizedEmail);
      setProfile(data);

      if (!data) {
        Alert.alert(
          "No loyalty profile found",
          "No completed sessions have been recorded for that email yet."
        );
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Load failed", "Could not load loyalty points.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: hPad,
          paddingTop: 18,
          paddingBottom: 28,
        }}
      >
        <View style={{ width: "100%", maxWidth: 700, alignSelf: "center" }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>My Loyalty</Text>
              <Text style={styles.sub}>
                Check your points, league, completed visits, and reward progress.
              </Text>
            </View>

            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.92 }]}
            >
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
          </View>

          <Text style={styles.section}>Find your profile</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your booking email"
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {!!email.trim() && (
            <Text style={styles.helper}>Searching as: {normalizeEmail(email)}</Text>
          )}

          <Pressable
            onPress={loadProfile}
            disabled={loading}
            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Loading..." : "Load my loyalty"}
            </Text>
          </Pressable>

          {!!profile && (
            <View style={styles.card}>
              <View style={styles.heroRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{profile.customerName}</Text>
                  <Text style={styles.cardSub}>{profile.customerEmail}</Text>
                </View>

                <LeagueBadgeVisual league={profile.currentLeague as LeagueName} />
              </View>

              <View style={styles.leagueInfoWrap}>
                <Text style={styles.leagueLabel}>Current League</Text>
                <Text style={styles.leagueValue}>{profile.currentLeague}</Text>
              </View>

              <View style={styles.statsRow}>
                <StatCard label="Points" value={String(profile.totalPoints)} />
                <StatCard label="Visits" value={String(profile.totalVisits)} />
                <StatCard label="Completed" value={String(profile.completedBookings)} />
              </View>

              <View style={styles.rewardCard}>
                <Text style={styles.rewardTitle}>Rewards</Text>
                <Text style={styles.rewardBig}>{profile.rewardsEarned}</Text>
                <Text style={styles.rewardSub}>
                  {profile.bookingsUntilNextReward} booking
                  {profile.bookingsUntilNextReward === 1 ? "" : "s"} until your next reward
                </Text>
                <Text style={styles.rewardHint}>
                  Every 7 completed bookings earns a free game or discount.
                </Text>
              </View>

              <Text style={styles.progressTitle}>Progress to next league</Text>

              {progressMeta.nextLeague === "MAX" ? (
                <Text style={styles.progressSub}>
                  You’ve reached the top league. Keep going to defend your status.
                </Text>
              ) : (
                <>
                  <Text style={styles.progressSub}>
                    {progressMeta.remaining} points to {progressMeta.nextLeague}
                  </Text>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.max(6, Math.min(100, progressMeta.progress * 100))}%`,
                        },
                      ]}
                    />
                  </View>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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

  section: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 18,
    marginBottom: 8,
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

  helper: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "700",
    marginTop: 8,
    lineHeight: 18,
  },

  primaryBtn: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.gold,
  },
  primaryBtnText: {
    color: "#111",
    fontWeight: "900",
    textAlign: "center",
  },

  card: {
    marginTop: 18,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },

  heroRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  cardTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 18,
  },
  cardSub: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 6,
    fontWeight: "700",
  },

  leagueVisualWrap: {
    width: 108,
    height: 108,
    alignItems: "center",
    justifyContent: "center",
  },
  leagueVisualImg: {
    width: "100%",
    height: "100%",
  },

  fallbackLeagueBadge: {
    minWidth: 110,
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackLeagueBadgeText: {
    fontWeight: "900",
    fontSize: 14,
    textAlign: "center",
  },

  leagueInfoWrap: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  leagueLabel: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "800",
    fontSize: 12,
  },
  leagueValue: {
    color: theme.colors.goldSoft,
    fontWeight: "900",
    fontSize: 18,
    marginTop: 6,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    flexWrap: "wrap",
  },
  statCard: {
    flexGrow: 1,
    minWidth: 110,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  statValue: {
    color: theme.colors.goldSoft,
    fontWeight: "900",
    fontSize: 22,
  },
  statLabel: {
    color: "rgba(255,255,255,0.68)",
    marginTop: 6,
    fontWeight: "700",
  },

  rewardCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  rewardTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 15,
  },
  rewardBig: {
    color: theme.colors.goldSoft,
    fontWeight: "900",
    fontSize: 28,
    marginTop: 8,
  },
  rewardSub: {
    color: "white",
    fontWeight: "800",
    marginTop: 6,
  },
  rewardHint: {
    color: "rgba(255,255,255,0.68)",
    fontWeight: "700",
    marginTop: 8,
    lineHeight: 18,
  },

  progressTitle: {
    color: "white",
    fontWeight: "900",
    marginTop: 18,
    fontSize: 15,
  },
  progressSub: {
    color: "rgba(255,255,255,0.72)",
    marginTop: 8,
    fontWeight: "700",
    lineHeight: 18,
  },

  progressTrack: {
    marginTop: 12,
    width: "100%",
    height: 12,
    borderRadius: 999,
    backgroundColor: "#0d1f17",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.gold,
    borderRadius: 999,
  },
});
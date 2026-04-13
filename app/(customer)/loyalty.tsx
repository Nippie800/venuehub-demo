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
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { theme } from "../../src/ui/theme";
import {
  getLoyaltyProfileByEmail,
  LoyaltyProfile,
} from "../../src/domain/loyalty/loyaltyQueries";

function nextTierInfo(points: number) {
  if (points >= 250) {
    return {
      nextTier: "MAX",
      remaining: 0,
      progress: 1,
      currentFloor: 250,
      nextTarget: 250,
    };
  }

  if (points >= 100) {
    const currentFloor = 100;
    const nextTarget = 250;
    return {
      nextTier: "GOLD",
      remaining: nextTarget - points,
      progress: (points - currentFloor) / (nextTarget - currentFloor),
      currentFloor,
      nextTarget,
    };
  }

  const currentFloor = 0;
  const nextTarget = 100;
  return {
    nextTier: "SILVER",
    remaining: nextTarget - points,
    progress: (points - currentFloor) / (nextTarget - currentFloor),
    currentFloor,
    nextTarget,
  };
}

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

export default function CustomerLoyaltyScreen() {
  const { width } = useWindowDimensions();
  const hPad = useMemo(() => (width < 380 ? 16 : 24), [width]);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<LoyaltyProfile | null>(null);

  const progressMeta = useMemo(
    () => nextTierInfo(profile?.totalPoints ?? 0),
    [profile?.totalPoints]
  );

 const loadProfile = async () => {
  const normalizedEmail = email.trim().toLowerCase();

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
    Alert.alert("Load failed", "Could not load loyalty profile.");
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
        <View style={{ width: "100%", maxWidth: 640, alignSelf: "center" }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>My Loyalty</Text>
              <Text style={styles.sub}>
                Check your points, tier, and progress from completed Golf Bar sessions.
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
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{profile.customerName}</Text>
                  <Text style={styles.cardSub}>{profile.customerEmail}</Text>
                </View>
                <TierChip tier={profile.currentTier} />
              </View>

              <View style={styles.statsRow}>
                <StatCard label="Points" value={String(profile.totalPoints)} />
                <StatCard label="Visits" value={String(profile.totalVisits)} />
                <StatCard label="Completed" value={String(profile.completedBookings)} />
              </View>

              <Text style={styles.progressTitle}>Progress to next tier</Text>

              {progressMeta.nextTier === "MAX" ? (
                <Text style={styles.progressSub}>
                  You’ve reached the top tier. Keep playing to stay on top.
                </Text>
              ) : (
                <>
                  <Text style={styles.progressSub}>
                    {progressMeta.remaining} points to {progressMeta.nextTier}
                  </Text>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.max(6, Math.min(100, progressMeta.progress * 100))}%` },
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
  cardTop: {
    flexDirection: "row",
    gap: 12,
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
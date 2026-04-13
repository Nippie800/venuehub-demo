import React from "react";
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { theme } from "../src/ui/theme";
import { lockAll } from "../src/lib/roleLock";

function MetaPill({
  label,
  gold = false,
}: {
  label: string;
  gold?: boolean;
}) {
  return (
    <View style={[styles.metaPillBase, gold ? styles.metaPillGoldWrap : styles.metaPillWrap]}>
      <Text style={gold ? styles.metaPillGoldText : styles.metaPillText}>{label}</Text>
    </View>
  );
}

function ModeCard({
  title,
  subtitle,
  onPress,
  children,
  featured = false,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  children?: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        featured && styles.featuredCard,
        pressed && { opacity: 0.94, transform: [{ scale: 0.995 }] },
      ]}
    >
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle}>{title}</Text>
        {featured && <MetaPill label="Featured" gold />}
      </View>

      <Text style={styles.cardSub}>{subtitle}</Text>

      {!!children && <View style={styles.metaRow}>{children}</View>}
    </Pressable>
  );
}

export default function Home() {
  const { width } = useWindowDimensions();
  const pad = width < 380 ? 16 : 24;
  const maxWidth = width > 900 ? 860 : 720;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: pad,
          paddingTop: 18,
          paddingBottom: 28,
        }}
      >
        <View style={[styles.wrap, { maxWidth, alignSelf: "center" }]}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>VENUE INFRASTRUCTURE</Text>
            <Text style={styles.title}>VenueHub</Text>
            <Text style={styles.sub}>
              Premium venue operations for in-venue ordering, session booking,
              and customer experience management.
            </Text>

            <View style={styles.heroPills}>
              <MetaPill label="Golf Bar OS" gold />
              <MetaPill label="Multi-restaurant routing" />
              <MetaPill label="Bookings + loyalty ready" />
            </View>
          </View>

          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Customer access</Text>
            <Text style={styles.sectionSub}>
              Public flows customers can use without a PIN.
            </Text>

            <ModeCard
              title="Customer ordering"
              subtitle="Scan QR → choose restaurant → order food → track status live inside the venue."
              onPress={() => router.push("/(customer)")}
              featured
            >
              <MetaPill label="No login" />
              <MetaPill label="In-venue only" />
              <MetaPill label="Live tracking" />
            </ModeCard>

            <ModeCard
              title="Book a golf session"
              subtitle="Reserve a booth, pick an event type, and request an available time slot."
              onPress={() => router.push("/(customer)/book")}
            >
              <MetaPill label="Public booking" />
              <MetaPill label="Booth selection" />
              <MetaPill label="Availability aware" />
            </ModeCard>

            <ModeCard
              title="My loyalty"
              subtitle="Check your points, tier, completed visits, and progress to the next level."
              onPress={() => router.push("/(customer)/loyalty")}
            >
              <MetaPill label="Customer profile" />
              <MetaPill label="Points + tiers" />
              <MetaPill label="Progress tracking" />
            </ModeCard>
          </View>

          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Staff & operator access</Text>
            <Text style={styles.sectionSub}>
              Protected operational views for venue staff and restaurant partners.
            </Text>

            <ModeCard
              title="Venue mode"
              subtitle="Monitor live ops, runner flow, delivered orders, analytics, and venue-side controls."
              onPress={() =>
                router.push({
                  pathname: "/(auth)/pin",
                  params: { role: "venue", next: "/(venue)" },
                })
              }
            >
              <MetaPill label="PIN protected" gold />
              <MetaPill label="Venue staff" />
              <MetaPill label="Ops dashboard" />
            </ModeCard>

            <ModeCard
              title="Kitchen mode"
              subtitle="Receive incoming orders and move them through accept → preparing → ready."
              onPress={() =>
                router.push({
                  pathname: "/(auth)/pin",
                  params: { role: "kitchen", next: "/(kitchen)" },
                })
              }
            >
              <MetaPill label="PIN protected" gold />
              <MetaPill label="Restaurant partner" />
              <MetaPill label="Kitchen workflow" />
            </ModeCard>
          </View>

          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Demo utilities</Text>
            <Text style={styles.sectionSub}>
              Temporary tools for setup, testing, and pitch control.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/(auth)/pin",
                  params: { role: "venue", next: "/(venue)/seed" },
                })
              }
              style={({ pressed }) => [styles.utilBtn, pressed && { opacity: 0.92 }]}
            >
              <Text style={styles.utilBtnTitle}>Seed demo data</Text>
              <Text style={styles.utilBtnSub}>
                Initialize seeded venue demo data with venue PIN protection.
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={lockAll}
              style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.88 }]}
            >
              <Text style={styles.resetBtnText}>Reset demo locks</Text>
            </Pressable>
          </View>

          <View style={styles.footerBox}>
            <Text style={styles.footerTitle}>Pitch note</Text>
            <Text style={styles.footerHint}>
              For live demos, use a stable deployed web URL for QR flows so customer entry remains
              reliable across devices.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },

  hero: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  eyebrow: {
    color: theme.colors.goldSoft,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
  },
  sub: {
    color: "rgba(255,255,255,0.78)",
    marginTop: 8,
    fontWeight: "700",
    lineHeight: 21,
  },
  heroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },

  sectionWrap: {
    marginTop: 22,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
  },
  sectionSub: {
    color: "rgba(255,255,255,0.66)",
    marginTop: 6,
    fontWeight: "700",
    lineHeight: 18,
  },

  card: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  featuredCard: {
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  cardTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    flex: 1,
  },
  cardSub: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
    fontWeight: "700",
    lineHeight: 20,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  metaPillBase: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  metaPillWrap: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  metaPillGoldWrap: {
    backgroundColor: theme.colors.gold,
  },
  metaPillText: {
    color: "rgba(255,255,255,0.88)",
    fontWeight: "900",
    fontSize: 12,
  },
  metaPillGoldText: {
    color: "#111",
    fontWeight: "900",
    fontSize: 12,
  },

  utilBtn: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  utilBtnTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 16,
  },
  utilBtnSub: {
    color: "rgba(255,255,255,0.68)",
    marginTop: 6,
    fontWeight: "700",
    lineHeight: 18,
  },

  resetBtn: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.24)",
  },
  resetBtnText: {
    color: theme.colors.goldSoft,
    fontWeight: "900",
    textAlign: "center",
  },

  footerBox: {
    marginTop: 22,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  footerTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },
  footerHint: {
    marginTop: 8,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "700",
    lineHeight: 18,
    fontSize: 12,
  },
});
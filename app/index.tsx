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

function Pill({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "gold" | "blue";
}) {
  return (
    <View
      style={[
        styles.pill,
        variant === "gold" && styles.pillGold,
        variant === "blue" && styles.pillBlue,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          variant === "gold" && styles.pillTextGold,
          variant === "blue" && styles.pillTextBlue,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function HeroCard({
  eyebrow,
  title,
  subtitle,
  accent = "gold",
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  accent?: "gold" | "blue";
  children?: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.heroCard,
        accent === "blue" ? styles.heroCardBlue : styles.heroCardGold,
      ]}
    >
      <Text
        style={[
          styles.heroEyebrow,
          accent === "blue" ? styles.heroEyebrowBlue : styles.heroEyebrowGold,
        ]}
      >
        {eyebrow}
      </Text>

      <Text style={styles.heroTitle}>
        Venue<Text style={accent === "blue" ? styles.heroTitleBlue : styles.heroTitleGold}>Hub</Text>
        {accent === "blue" ? " Ops" : ""}
      </Text>

      <Text style={styles.heroSubtitle}>{subtitle}</Text>

      {!!children && <View style={styles.heroPillsRow}>{children}</View>}
    </View>
  );
}

function LargeCustomerCard({
  title,
  subtitle,
  onPress,
  featured,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  featured?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.largeCustomerCard,
        pressed && { opacity: 0.94, transform: [{ scale: 0.995 }] },
      ]}
    >
      <View style={styles.largeCustomerIconWrap}>
        <Text style={styles.largeCustomerIcon}>✈</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.largeCustomerTitle}>{title}</Text>
          {!!featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>FEATURED</Text>
            </View>
          )}
        </View>

        <Text style={styles.largeCustomerSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function SplitCard({
  title,
  subtitle,
  onPress,
  variant,
  icon,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  variant: "booking" | "loyalty" | "leaderboard";
  icon: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.splitCard,
        variant === "booking" && styles.splitCardBooking,
        variant === "loyalty" && styles.splitCardLoyalty,
        variant === "leaderboard" && styles.splitCardLeaderboard,
        pressed && { opacity: 0.94, transform: [{ scale: 0.995 }] },
      ]}
    >
      <View
        style={[
          styles.splitCardIconWrap,
          variant === "booking" && styles.splitCardIconBooking,
          variant === "loyalty" && styles.splitCardIconLoyalty,
          variant === "leaderboard" && styles.splitCardIconLeaderboard,
        ]}
      >
        <Text style={styles.splitCardIcon}>{icon}</Text>
      </View>

      <Text style={styles.splitCardTitle}>{title}</Text>
      <Text style={styles.splitCardSubtitle}>{subtitle}</Text>

      <Text style={styles.splitCardArrow}>→</Text>
    </Pressable>
  );
}

function AdminModeCard({
  title,
  subtitle,
  onPress,
  pin,
  footer,
  pills,
  variant,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  pin?: boolean;
  footer: string;
  pills: string[];
  variant: "venue" | "kitchen";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.adminCard,
        variant === "venue" ? styles.adminCardVenue : styles.adminCardKitchen,
        pressed && { opacity: 0.94, transform: [{ scale: 0.995 }] },
      ]}
    >
      <View style={styles.adminTopRow}>
        <View
          style={[
            styles.adminIconWrap,
            variant === "venue" ? styles.adminIconWrapVenue : styles.adminIconWrapKitchen,
          ]}
        >
          <Text style={styles.adminIcon}>{variant === "venue" ? "▣" : "↘"}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.adminTitleRow}>
            <Text style={styles.adminTitle}>{title}</Text>
            {!!pin && (
              <View style={styles.adminPinBadge}>
                <Text style={styles.adminPinBadgeText}>PIN</Text>
              </View>
            )}
          </View>

          <Text style={styles.adminSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.adminPillsRow}>
        {pills.map((pill) => (
          <View
            key={pill}
            style={[
              styles.adminPill,
              variant === "venue" ? styles.adminPillVenue : styles.adminPillKitchen,
            ]}
          >
            <Text
              style={[
                styles.adminPillText,
                variant === "venue" ? styles.adminPillTextVenue : styles.adminPillTextKitchen,
              ]}
            >
              {pill}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.adminDivider} />

      <View style={styles.adminFooterRow}>
        <Text style={styles.adminFooterAction}>
          {variant === "venue" ? "Enter venue mode" : "Enter kitchen mode"} →
        </Text>
        <Text style={styles.adminFooterLabel}>{footer}</Text>
      </View>
    </Pressable>
  );
}

export default function Home() {
  const { width } = useWindowDimensions();
  const pad = width < 380 ? 14 : 18;
  const maxWidth = width > 900 ? 860 : 760;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: pad,
          paddingTop: 10,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.wrap, { maxWidth, alignSelf: "center" }]}>
          {/* CUSTOMER HERO */}
          <HeroCard
            eyebrow="VENUE INFRASTRUCTURE"
            title="VenueHub"
            subtitle="Premium Golf Bar experience — order, book, and earn from anywhere in the venue."
            accent="gold"
          >
            <Pill label="Golf Bar OS" />
            <Pill label="No login required" />
            <Pill label="Live tracking" />
          </HeroCard>

          <SectionLabel>WHAT WOULD YOU LIKE TO DO?</SectionLabel>

          <LargeCustomerCard
            title="Order food"
            subtitle="Scan QR · choose restaurant · track your order live inside the venue."
            featured
            onPress={() => router.push("/(customer)")}
          />

          <View style={styles.splitGrid}>
            <SplitCard
              title="Book a golf session"
              subtitle="Reserve a booth, pick your event type, and grab a time slot."
              icon="◔"
              variant="booking"
              onPress={() => router.push("/(customer)/book")}
            />

            <SplitCard
              title="My loyalty"
              subtitle="Points, league, visits, and progress to the next level."
              icon="☆"
              variant="loyalty"
              onPress={() => router.push("/(customer)/loyalty")}
            />
          </View>

          <SplitCard
            title="Leaderboard"
            subtitle="Top Golf Bar players · live loyalty standings · podium rankings."
            icon="🏆"
            variant="leaderboard"
            onPress={() => router.push("/(customer)/leaderboard")}
          />

          {/* ADMIN HERO */}
          <HeroCard
            eyebrow="STAFF & OPERATOR ACCESS"
            title="VenueHub"
            subtitle="Protected operational views for venue staff and restaurant partners."
            accent="blue"
          >
            <Pill label="PIN required" variant="blue" />
            <Pill label="Protected access" variant="blue" />
          </HeroCard>

          <View style={styles.adminNotice}>
            <View style={styles.adminNoticeIconWrap}>
              <Text style={styles.adminNoticeIcon}>⌂</Text>
            </View>
            <Text style={styles.adminNoticeText}>
              PIN required — all modes below are protected. Contact your venue manager for access credentials.
            </Text>
          </View>

          <SectionLabel>SELECT YOUR MODE</SectionLabel>

          <AdminModeCard
            title="Venue mode"
            subtitle="Full ops dashboard — live orders, runner flow, analytics, customer insight, incoming bookings, and leaderboard data."
            pin
            footer="Venue staff"
            variant="venue"
            pills={["Analytics", "Live orders", "Customer insight", "Bookings", "Leaderboard"]}
            onPress={() =>
              router.push({
                pathname: "/(auth)/pin",
                params: { role: "venue", next: "/(venue)" },
              })
            }
          />

          <AdminModeCard
            title="Kitchen mode"
            subtitle="Receive and manage incoming orders — move through accept → preparing → ready workflow with live updates."
            pin
            footer="Kitchen display"
            variant="kitchen"
            pills={["Incoming orders", "Status workflow", "Restaurant partner"]}
            onPress={() =>
              router.push({
                pathname: "/(auth)/pin",
                params: { role: "kitchen", next: "/(kitchen)" },
              })
            }
          />

          {/* OPTIONAL DEV / DEMO TOOLS */}
          <View style={styles.devWrap}>
            <Pressable
              onPress={lockAll}
              style={({ pressed }) => [styles.devBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.devBtnText}>Reset demo locks</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(auth)/pin",
                  params: { role: "venue", next: "/(venue)/seed" },
                })
              }
              style={({ pressed }) => [styles.devBtnAlt, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.devBtnAltText}>Seed demo data</Text>
            </Pressable>
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

  heroCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
  },
  heroCardGold: {
    backgroundColor: "#062616",
    borderColor: "rgba(255,215,0,0.14)",
  },
  heroCardBlue: {
    backgroundColor: "#07172f",
    borderColor: "rgba(67,136,255,0.18)",
    marginTop: 22,
    marginBottom: 12,
  },

  heroEyebrow: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
  },
  heroEyebrowGold: {
    color: "#7da76c",
  },
  heroEyebrowBlue: {
    color: "#6aa6ff",
  },

  heroTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
  },
  heroTitleGold: {
    color: theme.colors.gold,
  },
  heroTitleBlue: {
    color: "#4596ff",
  },

  heroSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 520,
  },

  heroPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },

  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.10)",
  },
  pillGold: {
    backgroundColor: "rgba(69,150,255,0.08)",
    borderColor: "rgba(69,150,255,0.18)",
  },
  pillBlue: {
    backgroundColor: "rgba(69,150,255,0.08)",
    borderColor: "rgba(69,150,255,0.18)",
  },
  pillText: {
    color: "rgba(255,255,255,0.82)",
    fontWeight: "800",
    fontSize: 12,
  },
  pillTextGold: {
    color: "rgba(255,255,255,0.82)",
  },
  pillTextBlue: {
    color: "#8cbcff",
  },

  sectionLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },

  largeCustomerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#163620",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 10,
  },
  largeCustomerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(103, 194, 132, 0.12)",
  },
  largeCustomerIcon: {
    color: "#7EDB8F",
    fontSize: 18,
    fontWeight: "900",
  },
  cardTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  largeCustomerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    flexShrink: 1,
  },
  featuredBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,215,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.18)",
  },
  featuredBadgeText: {
    color: theme.colors.goldSoft,
    fontSize: 11,
    fontWeight: "900",
  },
  largeCustomerSubtitle: {
    color: "rgba(255,255,255,0.68)",
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 6,
  },

  splitGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  splitCard: {
    flex: 1,
    minHeight: 170,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  splitCardBooking: {
    backgroundColor: "#1f2c12",
    borderColor: "rgba(255,215,0,0.08)",
  },
  splitCardLoyalty: {
    backgroundColor: "#1b1a3b",
    borderColor: "rgba(124,103,255,0.14)",
  },
  splitCardLeaderboard: {
    backgroundColor: "#2b1805",
    borderColor: "rgba(255,179,71,0.14)",
    marginBottom: 6,
  },

  splitCardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  splitCardIconBooking: {
    backgroundColor: "rgba(255,215,0,0.10)",
  },
  splitCardIconLoyalty: {
    backgroundColor: "rgba(124,103,255,0.14)",
  },
  splitCardIconLeaderboard: {
    backgroundColor: "rgba(255,179,71,0.14)",
  },
  splitCardIcon: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
  },

  splitCardTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
  },
  splitCardSubtitle: {
    color: "rgba(255,255,255,0.68)",
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 8,
  },
  splitCardArrow: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 18,
  },

  adminNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#0b2346",
    borderWidth: 1,
    borderColor: "rgba(69,150,255,0.16)",
    marginBottom: 18,
  },
  adminNoticeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(69,150,255,0.12)",
  },
  adminNoticeIcon: {
    color: "#77b3ff",
    fontWeight: "900",
  },
  adminNoticeText: {
    color: "rgba(255,255,255,0.7)",
    fontWeight: "700",
    lineHeight: 18,
    flex: 1,
  },

  adminCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  adminCardVenue: {
    backgroundColor: "#10264a",
    borderColor: "rgba(69,150,255,0.18)",
  },
  adminCardKitchen: {
    backgroundColor: "#2b1905",
    borderColor: "rgba(255,179,71,0.14)",
  },

  adminTopRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  adminIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  adminIconWrapVenue: {
    backgroundColor: "rgba(69,150,255,0.14)",
  },
  adminIconWrapKitchen: {
    backgroundColor: "rgba(255,179,71,0.12)",
  },
  adminIcon: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
  },

  adminTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  adminTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
  },
  adminPinBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(235,87,87,0.14)",
    borderWidth: 1,
    borderColor: "rgba(235,87,87,0.18)",
  },
  adminPinBadgeText: {
    color: "#ff8f8f",
    fontWeight: "900",
    fontSize: 11,
  },
  adminSubtitle: {
    color: "rgba(255,255,255,0.68)",
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 6,
  },

  adminPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  adminPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  adminPillVenue: {
    backgroundColor: "rgba(69,150,255,0.06)",
    borderColor: "rgba(69,150,255,0.16)",
  },
  adminPillKitchen: {
    backgroundColor: "rgba(255,179,71,0.06)",
    borderColor: "rgba(255,179,71,0.16)",
  },
  adminPillText: {
    fontWeight: "800",
    fontSize: 12,
  },
  adminPillTextVenue: {
    color: "#77b3ff",
  },
  adminPillTextKitchen: {
    color: "#e2a23d",
  },

  adminDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginTop: 16,
    marginBottom: 12,
  },

  adminFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  adminFooterAction: {
    color: "rgba(255,255,255,0.82)",
    fontWeight: "900",
  },
  adminFooterLabel: {
    color: "rgba(255,255,255,0.35)",
    fontWeight: "800",
    fontSize: 12,
  },

  devWrap: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
  },
  devBtn: {
    flexGrow: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  devBtnText: {
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
    fontWeight: "900",
  },
  devBtnAlt: {
    flexGrow: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#1e2a13",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.10)",
  },
  devBtnAltText: {
    color: theme.colors.goldSoft,
    textAlign: "center",
    fontWeight: "900",
  },
});
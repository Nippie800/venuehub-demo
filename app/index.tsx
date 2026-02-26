import React from "react";
import { View, Text, Pressable, SafeAreaView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { theme } from "../src/ui/theme";
import { lockAll } from "../src/lib/roleLock";

export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={styles.wrap}>
        {/* Brand header */}
        <Text style={styles.title}>VenueHub</Text>
        <Text style={styles.sub}>Venue-based multi-restaurant ordering infrastructure</Text>

        <View style={{ height: 18 }} />

        {/* Customer (no PIN) */}
        <Pressable
          onPress={() => router.push("/(customer)")}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
        >
          <Text style={styles.cardTitle}>Customer mode</Text>
          <Text style={styles.cardSub}>Scan QR → choose restaurant → order → live tracking</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaPill}>No login</Text>
            <Text style={styles.metaPill}>In-venue only</Text>
          </View>
        </Pressable>

        {/* Venue (PIN) */}
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(auth)/pin",
              params: { role: "venue", next: "/(venue)" },
            })
          }
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
        >
          <Text style={styles.cardTitle}>Venue mode</Text>
          <Text style={styles.cardSub}>Ops dashboard + runner view + delivered button</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaPillGold}>PIN protected</Text>
            <Text style={styles.metaPill}>Staff</Text>
          </View>
        </Pressable>

        {/* Kitchen (PIN) */}
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(auth)/pin",
              params: { role: "kitchen", next: "/(kitchen)" },
            })
          }
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
        >
          <Text style={styles.cardTitle}>Kitchen mode</Text>
          <Text style={styles.cardSub}>Incoming orders → accept → preparing → ready</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaPillGold}>PIN protected</Text>
            <Text style={styles.metaPill}>Restaurant</Text>
          </View>
        </Pressable>

        {/* Utilities */}
        <View style={{ height: 16 }} />

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(auth)/pin",
              params: { role: "venue", next: "/(venue)/seed" },
            })
          }
          style={({ pressed }) => [styles.utilBtn, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.utilBtnText}>Seed demo data (venue PIN)</Text>
        </Pressable>

        <Pressable
          onPress={lockAll}
          style={({ pressed }) => [{ marginTop: 12 }, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.resetText}>Reset locks (demo)</Text>
        </Pressable>

        <Text style={styles.footerHint}>
          Tip: For Friday, deploy Expo Web so QR links stay stable (no tunnel drop).
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: "center" },

  title: { color: "white", fontSize: 34, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.75)", marginTop: 6, fontWeight: "700", lineHeight: 20 },

  card: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  cardTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  cardSub: { color: "rgba(255,255,255,0.75)", marginTop: 6, fontWeight: "700", lineHeight: 20 },

  metaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 8 },
  metaPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    color: "rgba(255,255,255,0.85)",
    fontWeight: "900",
    overflow: "hidden",
  },
  metaPillGold: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.gold,
    color: "#111",
    fontWeight: "900",
    overflow: "hidden",
  },

  utilBtn: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  utilBtnText: { color: "white", fontWeight: "900", textAlign: "center" },

  resetText: { color: theme.colors.goldSoft, fontWeight: "900", textAlign: "center" },

  footerHint: {
    marginTop: 14,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
    fontSize: 12,
  },
});
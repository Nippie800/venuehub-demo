import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { theme } from "../../../src/ui/theme";

export default function BookingConfirmScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={styles.wrap}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>REQUEST RECEIVED</Text>
          </View>

          <Text style={styles.title}>Booking submitted ✅</Text>
          <Text style={styles.sub}>
            Your Golf Bar session request has been captured successfully.
          </Text>

          <View style={styles.refCard}>
            <Text style={styles.refLabel}>Booking reference</Text>
            <Text style={styles.refValue}>{bookingId ?? "Unavailable"}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What happens next?</Text>
            <Text style={styles.infoBody}>
              The Golf Bar team can now review your booking request, validate the slot,
              and confirm the session.
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/(customer)/book")}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.92 }]}
          >
            <Text style={styles.primaryBtnText}>Book another session</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/")}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.92 }]}
          >
            <Text style={styles.secondaryBtnText}>Back to home</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  card: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.gold,
  },
  badgeText: {
    color: "#111",
    fontWeight: "900",
    fontSize: 12,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 14,
  },
  sub: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 8,
    lineHeight: 20,
    fontWeight: "700",
  },
  refCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  refLabel: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "900",
  },
  refValue: {
    color: theme.colors.goldSoft,
    fontWeight: "900",
    marginTop: 8,
    fontSize: 15,
  },
  infoBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  infoTitle: {
    color: "white",
    fontWeight: "900",
  },
  infoBody: {
    color: "rgba(255,255,255,0.72)",
    marginTop: 8,
    lineHeight: 20,
    fontWeight: "700",
  },
  primaryBtn: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.gold,
  },
  primaryBtnText: {
    color: "#111",
    fontWeight: "900",
    textAlign: "center",
  },
  secondaryBtn: {
    marginTop: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  secondaryBtnText: {
    color: "white",
    fontWeight: "900",
    textAlign: "center",
  },
});
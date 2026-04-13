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
import { router, useLocalSearchParams } from "expo-router";
import { getDoc } from "firebase/firestore";
import { refs } from "../../../src/lib/firestoreRefs";
import { theme } from "../../../src/ui/theme";

type BookingDoc = {
  bookingRef?: string;
  customerName?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  boothLabel?: string;
  boothType?: string;
  eventType?: string;
  guestCount?: number;
  status?: string;
};

function loyaltyPreviewPoints(input: { eventType?: string; boothType?: string }) {
  let points = 25;
  if (input.eventType === "BIRTHDAY") points += 10;
  if (input.eventType === "CORPORATE") points += 15;
  if (input.boothType === "ADVANCED") points += 5;
  return points;
}

export default function BookingConfirmScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { width } = useWindowDimensions();
  const hPad = useMemo(() => (width < 380 ? 16 : 24), [width]);

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingDoc | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!bookingId) return;

      try {
        const snap = await getDoc(refs.booking(String(bookingId)));
        if (!mounted) return;

        if (!snap.exists()) {
          Alert.alert("Booking not found", "We could not load your booking.");
          setBooking(null);
          return;
        }

        setBooking(snap.data() as BookingDoc);
      } catch (e) {
        console.log(e);
        Alert.alert("Load failed", "Could not load booking confirmation.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [bookingId]);

  const estimatedPoints = useMemo(() => {
    return loyaltyPreviewPoints({
      eventType: booking?.eventType,
      boothType: booking?.boothType,
    });
  }, [booking]);

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
          {loading ? (
            <View style={{ marginTop: 40 }}>
              <ActivityIndicator color={theme.colors.gold} />
            </View>
          ) : !booking ? (
            <View style={styles.card}>
              <Text style={styles.title}>Booking not found</Text>
              <Text style={styles.sub}>
                We couldn’t load your booking confirmation right now.
              </Text>

              <Pressable
                onPress={() => router.replace("/")}
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.92 }]}
              >
                <Text style={styles.primaryBtnText}>Back to home</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.heroCard}>
                <Text style={styles.heroEyebrow}>BOOKING REQUEST RECEIVED</Text>
                <Text style={styles.heroTitle}>You’re booked in 🎯</Text>
                <Text style={styles.heroSub}>
                  Your request has been submitted to Golf Bar for review.
                </Text>

                <View style={styles.refBox}>
                  <Text style={styles.refLabel}>Booking reference</Text>
                  <Text style={styles.refValue}>
                    {booking.bookingRef ?? `BOOK-${String(bookingId).slice(0, 6).toUpperCase()}`}
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Booking summary</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Name</Text>
                  <Text style={styles.summaryValue}>{booking.customerName ?? "-"}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Date</Text>
                  <Text style={styles.summaryValue}>{booking.bookingDate ?? "-"}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Time</Text>
                  <Text style={styles.summaryValue}>
                    {booking.startTime ?? "-"} – {booking.endTime ?? "-"}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Booth</Text>
                  <Text style={styles.summaryValue}>{booking.boothLabel ?? "-"}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Event</Text>
                  <Text style={styles.summaryValue}>{booking.eventType ?? "-"}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Guests</Text>
                  <Text style={styles.summaryValue}>{booking.guestCount ?? "-"}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Status</Text>
                  <Text style={styles.summaryValue}>{booking.status ?? "PENDING"}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>What happens next</Text>

                <View style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepText}>
                    Golf Bar reviews your booking request and confirms availability.
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepText}>
                    Once approved, your booking status updates in the venue system.
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepText}>
                    On the day of your visit, arrive a few minutes early for a smooth check-in.
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepText}>
                    Keep your booking reference handy in case the venue needs it.
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Loyalty preview</Text>
                <Text style={styles.loyaltyBig}>+{estimatedPoints} points</Text>
                <Text style={styles.loyaltySub}>
                  Complete this visit and these points can be added to your loyalty profile.
                </Text>
              </View>

              <View style={styles.actions}>
                <Pressable
                  onPress={() => router.push("/(customer)/loyalty")}
                  style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.92 }]}
                >
                  <Text style={styles.secondaryBtnText}>My loyalty</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push("/app/index")}
                  style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.92 }]}
                >
                  <Text style={styles.primaryBtnText}>Back to home</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  heroEyebrow: {
    color: theme.colors.goldSoft,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 8,
  },
  heroSub: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 8,
    fontWeight: "700",
    lineHeight: 20,
  },

  refBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  refLabel: {
    color: "rgba(255,255,255,0.65)",
    fontWeight: "800",
    fontSize: 12,
  },
  refValue: {
    color: theme.colors.goldSoft,
    fontWeight: "900",
    fontSize: 22,
    marginTop: 6,
  },

  card: {
    marginTop: 16,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },

  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
  },
  sub: {
    color: "rgba(255,255,255,0.72)",
    marginTop: 8,
    fontWeight: "700",
    lineHeight: 20,
  },

  sectionTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.68)",
    fontWeight: "700",
    flex: 1,
  },
  summaryValue: {
    color: "white",
    fontWeight: "900",
    flex: 1,
    textAlign: "right",
  },

  stepRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginTop: 10,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.gold,
    marginTop: 5,
  },
  stepText: {
    flex: 1,
    color: "rgba(255,255,255,0.76)",
    fontWeight: "700",
    lineHeight: 20,
  },

  loyaltyBig: {
    color: theme.colors.goldSoft,
    fontWeight: "900",
    fontSize: 30,
  },
  loyaltySub: {
    color: "rgba(255,255,255,0.72)",
    marginTop: 8,
    fontWeight: "700",
    lineHeight: 20,
  },

  actions: {
    marginTop: 18,
    gap: 10,
  },

  primaryBtn: {
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
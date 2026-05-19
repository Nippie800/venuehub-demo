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
  let points = 30;
  if (input.eventType === "BIRTHDAY") points += 10;
  if (input.eventType === "CORPORATE") points += 15;
  if (input.boothType === "ADVANCED") points += 5;
  return points;
}

function getStatusTone(status?: string) {
  switch (status) {
    case "CONFIRMED":
      return {
        bg: "#eef8f0",
        border: "#d7eadb",
        text: "#0f5132",
        label: "Confirmed",
      };
    case "REJECTED":
      return {
        bg: "#fff7ed",
        border: "#fed7aa",
        text: "#9a3412",
        label: "Not confirmed",
      };
    case "COMPLETED":
      return {
        bg: "#eef8f0",
        border: "#d7eadb",
        text: "#0f5132",
        label: "Completed",
      };
    default:
      return {
        bg: "#f8fafc",
        border: "#e5e7eb",
        text: "#334155",
        label: "Pending review",
      };
  }
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

  const bookingReference = useMemo(() => {
    return booking?.bookingRef ?? `BOOK-${String(bookingId).slice(0, 6).toUpperCase()}`;
  }, [booking?.bookingRef, bookingId]);

  const statusTone = useMemo(() => getStatusTone(booking?.status), [booking?.status]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f4f1ea" }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: hPad,
          paddingTop: 18,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: 680, alignSelf: "center" }}>
          {loading ? (
            <View style={{ marginTop: 40 }}>
              <ActivityIndicator color={theme.colors.gold} />
            </View>
          ) : !booking ? (
            <View style={styles.surfaceCard}>
              <Text style={styles.titleDark}>Booking not found</Text>
              <Text style={styles.subDark}>
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
              <View style={styles.heroShell}>
                <View style={styles.heroTop}>
                  <Text style={styles.heroEyebrow}>GOLF BAR</Text>
                  <Text style={styles.heroBrand}>
                    Venue<Text style={styles.heroAccent}>Hub</Text>
                  </Text>
                  <Text style={styles.heroTitle}>Booking request received</Text>
                  <Text style={styles.heroSub}>
                    Your booking has been submitted successfully and is now in the Golf Bar system.
                  </Text>
                </View>

                <View style={styles.heroBottom}>
                  <View style={styles.refPill}>
                    <Text style={styles.refPillText}>Booking Ref: {bookingReference}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: statusTone.bg,
                        borderColor: statusTone.border,
                      },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: statusTone.text }]}>
                      {statusTone.label}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.surfaceCard}>
                <Text style={styles.sectionTitleDark}>Booking summary</Text>

                <View style={styles.infoCard}>
                  <SummaryRow label="Name" value={booking.customerName ?? "-"} />
                  <SummaryRow label="Date" value={booking.bookingDate ?? "-"} />
                  <SummaryRow
                    label="Time"
                    value={`${booking.startTime ?? "-"} – ${booking.endTime ?? "-"}`}
                  />
                  <SummaryRow label="Booth" value={booking.boothLabel ?? "-"} />
                  <SummaryRow label="Booth type" value={booking.boothType ?? "-"} />
                  <SummaryRow label="Event" value={booking.eventType ?? "-"} />
                  <SummaryRow label="Guests" value={String(booking.guestCount ?? "-")} />
                </View>
              </View>

              <View style={styles.surfaceCard}>
                <Text style={styles.sectionTitleDark}>What happens next</Text>

                <View style={styles.nextStepBox}>
                  <Text style={styles.nextStepTitle}>Next step</Text>
                  <Text style={styles.nextStepText}>
                    Golf Bar will review your request and confirm availability for your selected slot.
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepText}>
                    Once approved, your booking status is updated in the venue system.
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepText}>
                    A confirmation email is sent to the email address used during booking.
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepText}>
                    Please arrive 10 minutes early and keep your booking reference ready.
                  </Text>
                </View>
              </View>

              <View style={styles.surfaceCard}>
                <Text style={styles.sectionTitleDark}>Loyalty preview</Text>
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
                  onPress={() => router.replace("/")}
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroShell: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.12)",
    backgroundColor: "#ffffff",
  },

  heroTop: {
    backgroundColor: "#062616",
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22,
  },
  heroEyebrow: {
    color: "#a7d08d",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heroBrand: {
    color: "white",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
    marginTop: 8,
  },
  heroAccent: {
    color: theme.colors.gold,
  },
  heroTitle: {
    color: "white",
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "900",
    marginTop: 14,
  },
  heroSub: {
    color: "rgba(255,255,255,0.78)",
    marginTop: 10,
    fontWeight: "700",
    lineHeight: 21,
  },

  heroBottom: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    backgroundColor: "#ffffff",
    gap: 12,
  },
  refPill: {
    alignSelf: "flex-start",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#f2b94b",
  },
  refPillText: {
    color: "#111",
    fontWeight: "900",
    fontSize: 13,
  },

  statusBadge: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontWeight: "900",
    fontSize: 12,
  },

  surfaceCard: {
    marginTop: 16,
    padding: 20,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  titleDark: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "900",
  },
  subDark: {
    color: "#475569",
    marginTop: 8,
    fontWeight: "700",
    lineHeight: 20,
  },

  sectionTitleDark: {
    color: "#0f2f1f",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },

  infoCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  summaryLabel: {
    color: "#64748b",
    fontWeight: "700",
    flex: 1,
  },
  summaryValue: {
    color: "#0f172a",
    fontWeight: "900",
    flex: 1,
    textAlign: "right",
  },

  nextStepBox: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#eef8f0",
    borderWidth: 1,
    borderColor: "#d7eadb",
    marginBottom: 10,
  },
  nextStepTitle: {
    color: "#0f5132",
    fontWeight: "900",
    fontSize: 14,
  },
  nextStepText: {
    color: "#274c3b",
    marginTop: 6,
    fontWeight: "700",
    lineHeight: 20,
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
    color: "#475569",
    fontWeight: "700",
    lineHeight: 20,
  },

  loyaltyBig: {
    color: theme.colors.gold,
    fontWeight: "900",
    fontSize: 32,
    lineHeight: 36,
  },
  loyaltySub: {
    color: "#475569",
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
    borderColor: "rgba(255,255,255,0.08)",
  },
  secondaryBtnText: {
    color: "white",
    fontWeight: "900",
    textAlign: "center",
  },
});
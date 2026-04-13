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
} from "react-native";
import { router } from "expo-router";
import { getDocs, query, where, collection } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { theme } from "../../src/ui/theme";

const VENUE_ID = "venue_golfbar_cs";

type BookingNotificationRow = {
  id: string;
  customerName?: string;
  customerEmail?: string;
  bookingDate?: string;
  boothLabel?: string;
  notificationType?: string | null;
  notificationStatus?: string | null;
  notificationError?: string | null;
};

function Chip({ text, gold = false }: { text: string; gold?: boolean }) {
  return (
    <View style={[styles.chip, gold && styles.chipGold]}>
      <Text style={[styles.chipText, gold && styles.chipGoldText]}>{text}</Text>
    </View>
  );
}

export default function VenueNotificationsScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BookingNotificationRow[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const q = query(
          collection(db, "bookings"),
          where("venueId", "==", VENUE_ID)
        );

        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<BookingNotificationRow, "id">),
        }));

        if (!mounted) return;
        setRows(data);
      } catch (e) {
        console.log(e);
        Alert.alert("Load failed", "Could not load notification records.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const pending = useMemo(
    () => rows.filter((r) => r.notificationStatus === "PENDING"),
    [rows]
  );

  const failed = useMemo(
    () => rows.filter((r) => r.notificationStatus === "FAILED"),
    [rows]
  );

  const sent = useMemo(
    () => rows.filter((r) => r.notificationStatus === "SENT"),
    [rows]
  );

  const Section = ({ title, data }: { title: string; data: BookingNotificationRow[] }) => (
    <View style={{ marginTop: 18 }}>
      <Text style={styles.sectionTitle}>
        {title} ({data.length})
      </Text>

      {data.length === 0 ? (
        <Text style={styles.empty}>None</Text>
      ) : (
        <View style={{ gap: 12, marginTop: 10 }}>
          {data.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={styles.cardTitle}>{r.customerName ?? "Unknown customer"}</Text>
              <Text style={styles.cardSub}>{r.customerEmail ?? "-"}</Text>

              <View style={styles.row}>
                <Chip text={r.bookingDate ?? "-"} />
                <Chip text={r.boothLabel ?? "-"} />
                <Chip text={r.notificationType ?? "UNKNOWN"} gold />
              </View>

              <Text style={styles.small}>Status: {r.notificationStatus ?? "-"}</Text>

              {!!r.notificationError && (
                <Text style={styles.error}>Error: {r.notificationError}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={{ maxWidth: 760, width: "100%", alignSelf: "center" }}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Notification Dashboard</Text>
              <Text style={styles.sub}>
                Monitor booking email delivery and failed notifications.
              </Text>
            </View>

            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={{ marginTop: 24 }}>
              <ActivityIndicator color={theme.colors.gold} />
            </View>
          ) : (
            <>
              <Section title="Pending" data={pending} />
              <Section title="Failed" data={failed} />
              <Section title="Sent" data={sent} />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { color: "white", fontSize: 26, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.72)", marginTop: 6, fontWeight: "700" },

  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  backBtnText: { color: "white", fontWeight: "900" },

  sectionTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  empty: { color: "rgba(255,255,255,0.65)", marginTop: 10, fontWeight: "700" },

  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  cardTitle: { color: "white", fontWeight: "900", fontSize: 16 },
  cardSub: { color: "rgba(255,255,255,0.7)", marginTop: 6, fontWeight: "700" },

  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },

  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  chipGold: { backgroundColor: theme.colors.gold },
  chipText: { color: "white", fontWeight: "900", fontSize: 12 },
  chipGoldText: { color: "#111", fontWeight: "900", fontSize: 12 },

  small: { color: "rgba(255,255,255,0.58)", marginTop: 10, fontWeight: "700" },
  error: { color: "#ffb3b3", marginTop: 8, fontWeight: "700" },
});
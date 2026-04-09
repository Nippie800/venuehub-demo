import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { setDoc } from "firebase/firestore";
import { refs } from "../../src/lib/firestoreRefs";
import { theme } from "../../src/ui/theme";

const VENUE_ID = "venue_golfbar_cs";

const BOOTHS = [
  {
    id: "booth_1",
    venueId: VENUE_ID,
    label: "Booth 1",
    type: "ADVANCED",
    active: true,
    sort: 1,
  },
  {
    id: "booth_2",
    venueId: VENUE_ID,
    label: "Booth 2",
    type: "ADVANCED",
    active: true,
    sort: 2,
  },
  {
    id: "booth_3",
    venueId: VENUE_ID,
    label: "Booth 3",
    type: "STANDARD",
    active: true,
    sort: 3,
  },
  {
    id: "booth_4",
    venueId: VENUE_ID,
    label: "Booth 4",
    type: "STANDARD",
    active: true,
    sort: 4,
  },
  {
    id: "booth_5",
    venueId: VENUE_ID,
    label: "Booth 5",
    type: "STANDARD",
    active: true,
    sort: 5,
  },
] as const;

export default function SeedBoothsScreen() {
  const [saving, setSaving] = useState(false);

  const seedBooths = async () => {
    if (saving) return;

    try {
      setSaving(true);

      for (const booth of BOOTHS) {
        await setDoc(refs.booth(booth.id), booth, { merge: true });
      }

      Alert.alert("Success", "5 booths seeded successfully.");
    } catch (e: any) {
      console.log(e);
      Alert.alert("Seed failed", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Seed Golf Bar Booths</Text>
        <Text style={styles.sub}>
          This will create 5 booth docs for Golf Bar:
          {"\n"}2 advanced, 3 standard.
        </Text>

        <View style={styles.card}>
          {BOOTHS.map((b) => (
            <View key={b.id} style={styles.row}>
              <Text style={styles.rowTitle}>{b.label}</Text>
              <Text style={styles.rowType}>{b.type}</Text>
            </View>
          ))}
        </View>

        <Pressable
          disabled={saving}
          onPress={seedBooths}
          style={({ pressed }) => [
            styles.btn,
            saving && { opacity: 0.6 },
            pressed && !saving && { opacity: 0.92 },
          ]}
        >
          <Text style={styles.btnText}>
            {saving ? "Seeding..." : "Seed Booths"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 24,
  },
  title: {
    color: "white",
    fontSize: 26,
    fontWeight: "900",
  },
  sub: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 8,
    lineHeight: 20,
    fontWeight: "700",
  },
  card: {
    marginTop: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowTitle: {
    color: "white",
    fontWeight: "900",
  },
  rowType: {
    color: theme.colors.goldSoft,
    fontWeight: "900",
  },
  btn: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.gold,
  },
  btnText: {
    color: "#111",
    fontWeight: "900",
    textAlign: "center",
  },
});
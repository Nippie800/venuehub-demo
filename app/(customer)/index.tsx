import React, { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { router } from "expo-router";

export default function CustomerHome() {
  // Demo defaults (seeded)
  const [venueId, setVenueId] = useState("venue_golfbar_cs");
  const [tableId, setTableId] = useState("G7");

  const go = () => {
    const v = venueId.trim();
    const t = tableId.trim();
    router.push(`/(customer)/venue/${v}/table/${t}`);
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>VenueHub</Text>
      <Text style={{ opacity: 0.7 }}>
        Demo QR Entry (Venue → Table → Restaurants)
      </Text>

      <Text style={{ fontWeight: "900", marginTop: 10 }}>Venue ID</Text>
      <TextInput
        value={venueId}
        onChangeText={setVenueId}
        autoCapitalize="none"
        style={{
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#ddd",
          backgroundColor: "white",
        }}
      />

      <Text style={{ fontWeight: "900" }}>Table ID</Text>
      <TextInput
        value={tableId}
        onChangeText={setTableId}
        autoCapitalize="characters"
        style={{
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#ddd",
          backgroundColor: "white",
        }}
      />

      <Pressable
        onPress={go}
        style={{ padding: 16, borderRadius: 14, backgroundColor: "#111" }}
      >
        <Text style={{ color: "white", fontWeight: "900", textAlign: "center" }}>
          Start Ordering
        </Text>
      </Pressable>

      <Text style={{ opacity: 0.6, marginTop: 6 }}>
        Seeded venue: venue_golfbar_cs • Example tables: G7 / A1 / T12
      </Text>
    </View>
  );
}
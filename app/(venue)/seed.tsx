import { useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { seedDemo } from "../../src/seed/seedDemo";

export default function SeedScreen() {
  const [loading, setLoading] = useState(false);

  const onSeed = async () => {
    try {
      setLoading(true);
      const result = await seedDemo();
      Alert.alert("Seed complete ✅", `Venue: ${result.venueId}`);
    } catch (e: any) {
      console.log(e);
      Alert.alert("Seed failed ❌", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>VenueHub Dev Tools</Text>

      <Pressable
        onPress={onSeed}
        disabled={loading}
        style={{
          padding: 16,
          borderRadius: 12,
          backgroundColor: loading ? "#444" : "#111",
        }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>
          {loading ? "Seeding..." : "Seed Demo Dataset"}
        </Text>
      </Pressable>

      <Text style={{ opacity: 0.7 }}>
        Creates 1 venue + 3 restaurants + menus.
      </Text>
    </View>
  );
}
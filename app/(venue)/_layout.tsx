import React, { useEffect } from "react";
import { View } from "react-native";
import { Stack, router } from "expo-router";
import { isUnlocked } from "../../src/lib/roleLock";
import { NetworkBanner } from "../../src/ui/NetworkBanner";

export default function VenueLayout() {
  useEffect(() => {
    (async () => {
      const ok = await isUnlocked("venue");
      if (!ok) {
        router.replace({
          pathname: "/(auth)/pin",
          params: { role: "venue", next: "/(venue)" },
        });
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <NetworkBanner />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
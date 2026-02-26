import React, { useEffect } from "react";
import { View } from "react-native";
import { Stack, router } from "expo-router";
import { isUnlocked } from "../../src/lib/roleLock";
import { NetworkBanner } from "../../src/ui/NetworkBanner";

export default function KitchenLayout() {
  useEffect(() => {
    (async () => {
      const ok = await isUnlocked("kitchen");
      if (!ok) {
        router.replace({
          pathname: "/(auth)/pin",
          params: { role: "kitchen", next: "/(kitchen)" },
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
import React from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { NetworkBanner } from "../../src/ui/NetworkBanner";

export default function CustomerLayout() {
  return (
    <View style={{ flex: 1 }}>
      <NetworkBanner />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
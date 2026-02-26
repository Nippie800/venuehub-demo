import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { theme } from "./theme";

export function NetworkBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const ok = Boolean(state.isConnected && state.isInternetReachable !== false);
      setOnline(ok);
    });
    return () => unsub();
  }, []);

  if (online) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>Trying to reconnect…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#0d1f17",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gold,
  },
  text: {
    color: "white",
    fontWeight: "900",
    textAlign: "center",
  },
});
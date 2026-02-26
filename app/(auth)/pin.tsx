import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, SafeAreaView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import Constants from "expo-constants";
import { unlock, Role } from "../../src/lib/roleLock";
import { theme } from "../../src/ui/theme";

export default function PinScreen() {
  const { role, next } = useLocalSearchParams<{ role: Role; next?: string }>();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  const expected = useMemo(() => {
    const extra = (Constants.expoConfig?.extra ?? {}) as any;
    if (role === "venue") return String(extra.VENUE_PIN ?? "2468");
    if (role === "kitchen") return String(extra.KITCHEN_PIN ?? "1357");
    return "";
  }, [role]);

  const title = role === "venue" ? "Venue access" : role === "kitchen" ? "Kitchen access" : "Access";

  const submit = async () => {
    setErr("");
    if (!role || (role !== "venue" && role !== "kitchen")) {
      setErr("Invalid role");
      return;
    }
    if (pin.trim() !== expected) {
      setErr("Incorrect PIN");
      return;
    }
    await unlock(role);

    // Go where user wanted to go
    if (next) router.replace(next);
    else router.replace(role === "venue" ? "/(venue)" : "/(kitchen)");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={styles.wrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>Demo-safe access control. Real auth comes later.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Enter PIN</Text>
          <TextInput
            value={pin}
            onChangeText={(t) => setPin(t.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="••••"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.input}
          />

          {!!err && <Text style={styles.err}>{err}</Text>}

          <Pressable onPress={submit} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.92 }]}>
            <Text style={styles.btnText}>Unlock</Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={{ marginTop: 10 }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", textAlign: "center", fontWeight: "800" }}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: "center" },
  title: { color: "white", fontSize: 28, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.75)", marginTop: 8, lineHeight: 20, fontWeight: "700" },

  card: {
    marginTop: 18,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },

  label: { color: "rgba(255,255,255,0.8)", fontWeight: "900", marginBottom: 8 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 14,
    color: "white",
    fontWeight: "900",
    fontSize: 18,
    backgroundColor: "#0d1f17",
  },

  err: { color: "#ffb4b4", marginTop: 10, fontWeight: "800" },

  btn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.gold,
  },
  btnText: { textAlign: "center", fontWeight: "900", color: "#111", fontSize: 16 },
});
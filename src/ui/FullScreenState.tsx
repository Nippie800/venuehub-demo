import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { theme } from "./theme";

export function FullScreenState({
  title,
  body,
  actionText,
  onAction,
}: {
  title: string;
  body?: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {!!body && <Text style={styles.body}>{body}</Text>}
      {!!actionText && !!onAction && (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.92 }]}>
          <Text style={styles.btnText}>{actionText}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: "center" },
  title: { color: "white", fontSize: 22, fontWeight: "900", textAlign: "center" },
  body: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 10,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "700",
  },
  btn: { marginTop: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: theme.colors.gold },
  btnText: { textAlign: "center", fontWeight: "900", color: "#111" },
});
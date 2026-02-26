import React from "react";
import { Pressable, Text, View } from "react-native";
import { theme } from "./theme";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 26, fontWeight: "900", color: theme.colors.white }}>
        {title}
      </Text>
      {!!subtitle && (
        <Text style={{ color: "rgba(255,255,255,0.85)" }}>{subtitle}</Text>
      )}
    </View>
  );
}

export function Pill({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: theme.colors.gold,
        backgroundColor: "rgba(0,0,0,0.15)",
      }}
    >
      <Text style={{ color: theme.colors.goldSoft, fontWeight: "900" }}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        padding: 16,
        borderRadius: theme.radius.md,
        backgroundColor: disabled ? "rgba(17,17,17,0.6)" : theme.colors.dark,
      }}
    >
      <Text style={{ color: "white", fontWeight: "900", textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function GoldBadge({ text }: { text: string }) {
  return (
    <View
      style={{
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.bg,
        borderWidth: 1,
        borderColor: theme.colors.gold,
      }}
    >
      <Text style={{ color: theme.colors.goldSoft, fontWeight: "900" }}>{text}</Text>
    </View>
  );
}
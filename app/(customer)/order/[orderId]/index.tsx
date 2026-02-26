import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { onSnapshot } from "firebase/firestore";
import { refs } from "../../../../src/lib/firestoreRefs";
import { timeAgoFromTimestamp } from "../../../../src/ui/time";
import { theme } from "../../../../src/ui/theme";
import { setOrderRating } from "../../../../src/domain/orders/orderMutations";

const FLOW = ["PLACED", "ACCEPTED", "PREPARING", "READY", "DELIVERED"] as const;
type FlowStatus = (typeof FLOW)[number];

function headline(status: string) {
  switch (status) {
    case "PLACED":
      return "Order placed";
    case "ACCEPTED":
      return "Kitchen accepted";
    case "PREPARING":
      return "Preparing";
    case "READY":
      return "Ready soon";
    case "DELIVERED":
      return "Delivered";
    default:
      return "Order update";
  }
}

function etaPlaceholder(status: string) {
  switch (status) {
    case "PLACED":
      return "Estimated ready time: ~20–35 min";
    case "ACCEPTED":
      return "Estimated ready time: ~15–30 min";
    case "PREPARING":
      return "Estimated ready time: ~10–20 min";
    case "READY":
      return "Estimated ready time: now / being brought to you";
    case "DELIVERED":
      return "Completed";
    default:
      return "Estimated ready time: —";
  }
}

function statusIndex(status?: string) {
  const idx = FLOW.indexOf((status ?? "PLACED") as any);
  return idx < 0 ? 0 : idx;
}

function formatClock(ts: any) {
  const d = ts?.toDate?.() ?? (typeof ts?.seconds === "number" ? new Date(ts.seconds * 1000) : null);
  if (!d) return null;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ProgressRow({
  label,
  state,
  time,
}: {
  label: string;
  state: "done" | "active" | "todo";
  time?: string | null;
}) {
  const dotBg =
    state === "done"
      ? theme.colors.gold
      : state === "active"
      ? "rgba(255,215,0,0.35)"
      : "rgba(255,255,255,0.10)";

  const textColor = state === "todo" ? "rgba(255,255,255,0.60)" : "white";

  const icon = state === "done" ? "✓" : state === "active" ? "●" : "○";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: dotBg,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.14)",
        }}
      >
        <Text style={{ color: state === "done" ? "#111" : "white", fontWeight: "900" }}>
          {icon}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: textColor, fontWeight: "900" }}>{label}</Text>
        {!!time && <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "800", marginTop: 2 }}>{time}</Text>}
      </View>
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  // value: 0..1
  return (
    <View
      style={{
        height: 10,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.10)",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
      }}
    >
      <View
        style={{
          height: "100%",
          width: `${Math.max(3, Math.min(100, value * 100))}%`,
          backgroundColor: theme.colors.gold,
        }}
      />
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        padding: 14,
        borderRadius: 18,
        backgroundColor: "#0d1f17",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
        gap: 10,
      }}
    >
      {children}
    </View>
  );
}

export default function CustomerOrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Table activity doc
  const [tableActivity, setTableActivity] = useState<{ activeOrdersCount?: number } | null>(null);

  // Smart waiting engagement
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!orderId) return;

    const unsub = onSnapshot(refs.order(orderId), (snap) => {
      setLoading(false);
      setOrder(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });

    return unsub;
  }, [orderId]);

  // Listen to table activity (no heavy query, just 1 doc)
  useEffect(() => {
    if (!order?.venueId || !order?.tableId) return;
    const ref = refs.venueTable(order.venueId, order.tableId); // you’ll add this helper below if missing
    const unsub = onSnapshot(ref, (snap) => {
      setTableActivity(snap.exists() ? (snap.data() as any) : null);
    });
    return unsub;
  }, [order?.venueId, order?.tableId]);

  const createdLabel = useMemo(() => timeAgoFromTimestamp(order?.createdAt), [order?.createdAt]);
  const idx = useMemo(() => statusIndex(order?.status), [order?.status]);
  const progress = useMemo(() => (FLOW.length <= 1 ? 0 : idx / (FLOW.length - 1)), [idx]);

  const tips = useMemo(() => {
    const name = order?.restaurantName ?? "the kitchen";
    return [
      `Did you know? ${name} is known for slow-smoked brisket 🔥`,
      `Your order is routed directly to ${name} — not a venue kitchen.`,
      etaPlaceholder(order?.status),
      "Pickup/delivery is handled by venue staff inside Golf Bar.",
    ];
  }, [order?.restaurantName, order?.status]);

  useEffect(() => {
    if (!order) return;
    // Rotate tip every ~6 seconds while not delivered
    if (order.status === "DELIVERED") return;

    const t = setInterval(() => {
      setTipIndex((p) => (p + 1) % tips.length);
    }, 6000);

    return () => clearInterval(t);
  }, [order, tips.length]);

  const stamp = (s: FlowStatus) => {
    const ts = order?.statusTimestamps?.[s];
    const t = formatClock(ts);
    return t ? `${s} at ${t}` : null;
  };

  const canRate = order?.status === "DELIVERED" || order?.status === "READY";
  const hasRated = !!order?.rating;

  const submitRating = async (rating: "POSITIVE" | "NEUTRAL" | "NEGATIVE") => {
  try {
    await setOrderRating(order.id, rating);
  } catch (e) {
    console.log(e);
  }
};
  if (!orderId) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
        <Text style={{ color: "white" }}>Missing orderId</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
        <ActivityIndicator color={theme.colors.gold} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
        <Text style={{ color: "white" }}>Order not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 28, gap: 12 }} style={{ backgroundColor: theme.colors.bg }}>
      {/* Top */}
      <View style={{ gap: 6 }}>
        <Text style={{ color: "white", fontSize: 24, fontWeight: "900" }}>{headline(order.status)}</Text>
        <Text style={{ color: "rgba(255,255,255,0.70)", fontWeight: "800" }}>
          {createdLabel} • Table {order.tableId}
        </Text>

        {/* Table activity indicator */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          <View
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.08)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.14)",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>
              Table {order.tableId}
            </Text>
          </View>

          <View
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: "rgba(255,215,0,0.14)",
              borderWidth: 1,
              borderColor: "rgba(255,215,0,0.22)",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>
              {tableActivity?.activeOrdersCount ?? "—"} active orders
            </Text>
          </View>
        </View>
      </View>

      {/* Routed banner */}
      <Card>
        <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
          Routed directly to {order.restaurantName ?? "kitchen"} ✅
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.78)", fontWeight: "700", lineHeight: 18 }}>
          Golf Bar is not a kitchen. Your order is sent straight to the partner restaurant, and venue staff handle delivery inside the venue.
        </Text>
      </Card>

      {/* Progress bar */}
      <Card>
        <Text style={{ color: "white", fontWeight: "900" }}>Live progress</Text>
        <ProgressBar value={progress} />

        <View style={{ gap: 10, marginTop: 10 }}>
          {FLOW.map((s, i) => {
            const state: "done" | "active" | "todo" =
              i < idx ? "done" : i === idx ? "active" : "todo";

            const time =
              s === "PLACED"
                ? formatClock(order?.createdAt)
                : stamp(s);

            return <ProgressRow key={s} label={s} state={state} time={time} />;
          })}
        </View>
      </Card>

      {/* Smart waiting engagement */}
      {order.status !== "DELIVERED" && (
        <Card>
          <Text style={{ color: "rgba(255,255,255,0.70)", fontWeight: "900" }}>While you wait</Text>
          <Text style={{ color: "white", fontWeight: "900", fontSize: 16, lineHeight: 20 }}>
            {tips[tipIndex]}
          </Text>
        </Card>
      )}

      {/* Items */}
      <Card>
        <Text style={{ color: "white", fontWeight: "900" }}>Items</Text>

        {(order.items ?? []).map((i: any) => (
          <View
            key={i.itemId}
            style={{
              padding: 12,
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>
              {i.qty}× {i.name}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.65)", fontWeight: "700", marginTop: 4 }}>
              R{i.price} each
            </Text>
          </View>
        ))}

        <Text style={{ color: "white", fontWeight: "900", marginTop: 6 }}>Subtotal: R{order.subtotal}</Text>
      </Card>

      {/* Satisfaction tap */}
      {canRate && (
        <Card>
          <Text style={{ color: "white", fontWeight: "900" }}>
            Quick check: how was it?
          </Text>

          {hasRated ? (
            <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "800" }}>
              Thanks — feedback received ✅
            </Text>
          ) : (
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Pressable
                onPress={() => submitRating("POSITIVE")}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  backgroundColor: theme.colors.gold,
                }}
              >
                <Text style={{ fontWeight: "900", color: "#111" }}>👍 Perfect</Text>
              </Pressable>

              <Pressable
                onPress={() => submitRating("NEUTRAL")}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                }}
              >
                <Text style={{ fontWeight: "900", color: "white" }}>👌 Good</Text>
              </Pressable>

              <Pressable
                onPress={() => submitRating("NEGATIVE")}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                }}
              >
                <Text style={{ fontWeight: "900", color: "white" }}>👎 Needs improvement</Text>
              </Pressable>
            </View>
          )}
        </Card>
      )}

      <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "700" }}>Order: {order.id}</Text>
    </ScrollView>
  );
}
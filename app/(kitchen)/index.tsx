import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { listenKitchenOrders } from "../../src/domain/orders/orderQueries";
import { updateOrderStatus } from "../../src/domain/orders/orderMutations";
import { timeAgoFromTimestamp } from "../../src/ui/time";

const RESTAURANTS = [
  { id: "rest_smokedaddys", name: "Smoke Daddys" },
  { id: "rest_pizza_palace", name: "Pizza Palace" },
  { id: "rest_sushi_spot", name: "Sushi Spot" },
];

type TabKey = "NEW" | "IN_PROGRESS" | "READY";

function money(v: number) {
  return `R${Math.round(v * 100) / 100}`;
}

function StatusChip({ status }: { status: string }) {
  const bg =
    status === "PLACED"
      ? "#fff3cd"
      : status === "ACCEPTED"
      ? "#d1ecf1"
      : status === "PREPARING"
      ? "#d4edda"
      : status === "READY"
      ? "#e2e3ff"
      : "#e5e5e5";

  return (
    <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: bg }}>
      <Text style={{ fontWeight: "900" }}>{status}</Text>
    </View>
  );
}

export default function KitchenDashboard() {
  const [restaurantId, setRestaurantId] = useState(RESTAURANTS[0].id);
  const [tab, setTab] = useState<TabKey>("NEW");
  const [orders, setOrders] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenKitchenOrders(restaurantId, setOrders);
    return unsub;
  }, [restaurantId]);

  // Sort newest first (if createdAt exists)
  const sorted = useMemo(() => {
    const copy = [...orders];
    copy.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    return copy;
  }, [orders]);

  const filtered = useMemo(() => {
    if (tab === "NEW") return sorted.filter((o) => o.status === "PLACED");
    if (tab === "IN_PROGRESS") return sorted.filter((o) => o.status === "ACCEPTED" || o.status === "PREPARING");
    return sorted.filter((o) => o.status === "READY");
  }, [sorted, tab]);

  const counts = useMemo(() => {
    const c = { NEW: 0, IN_PROGRESS: 0, READY: 0 };
    for (const o of sorted) {
      if (o.status === "PLACED") c.NEW++;
      else if (o.status === "ACCEPTED" || o.status === "PREPARING") c.IN_PROGRESS++;
      else if (o.status === "READY") c.READY++;
    }
    return c;
  }, [sorted]);

  const setStatus = async (orderId: string, status: "ACCEPTED" | "PREPARING" | "READY") => {
    try {
      setBusyId(orderId);
      await updateOrderStatus(orderId, status);
    } catch (e: any) {
      console.log(e);
      Alert.alert("Update failed", e?.message ?? "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const TabButton = ({ k, label }: { k: TabKey; label: string }) => {
    const active = tab === k;
    return (
      <Pressable
        onPress={() => setTab(k)}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 999,
          backgroundColor: active ? "#111" : "#e5e5e5",
        }}
      >
        <Text style={{ color: active ? "white" : "black", fontWeight: "900" }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const OrderCard = ({ o }: { o: any }) => {
    const disabled = busyId === o.id;
    const createdLabel = timeAgoFromTimestamp(o.createdAt);

    return (
      <View style={{ padding: 14, borderRadius: 14, backgroundColor: "#f2f2f2", gap: 8 }}>
        {/* Header row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontWeight: "900", fontSize: 16 }}>Table {o.tableId}</Text>
          <StatusChip status={o.status} />
        </View>

        <Text style={{ opacity: 0.75 }}>
          {createdLabel} • {money(o.subtotal)} • Venue: {o.venueId}
        </Text>

        {/* Items */}
        <View style={{ gap: 2 }}>
          {(o.items ?? []).map((i: any) => (
            <Text key={i.itemId} style={{ opacity: 0.95 }}>
              {i.qty}× {i.name}
            </Text>
          ))}
        </View>

        {/* Notes */}
        {!!o.notes && (
          <View style={{ padding: 10, borderRadius: 12, backgroundColor: "white", borderWidth: 1, borderColor: "#ddd" }}>
            <Text style={{ fontWeight: "900" }}>Notes</Text>
            <Text style={{ opacity: 0.8, marginTop: 2 }}>{o.notes}</Text>
          </View>
        )}

        {/* Actions */}
        {o.status === "PLACED" && (
          <Pressable
            disabled={disabled}
            onPress={() => setStatus(o.id, "ACCEPTED")}
            style={{ padding: 12, borderRadius: 12, backgroundColor: disabled ? "#444" : "#111" }}
          >
            <Text style={{ color: "white", fontWeight: "900", textAlign: "center" }}>
              {disabled ? "Updating..." : "Accept"}
            </Text>
          </Pressable>
        )}

        {o.status === "ACCEPTED" && (
          <Pressable
            disabled={disabled}
            onPress={() => setStatus(o.id, "PREPARING")}
            style={{ padding: 12, borderRadius: 12, backgroundColor: disabled ? "#444" : "#111" }}
          >
            <Text style={{ color: "white", fontWeight: "900", textAlign: "center" }}>
              {disabled ? "Updating..." : "Mark Preparing"}
            </Text>
          </Pressable>
        )}

        {o.status === "PREPARING" && (
          <Pressable
            disabled={disabled}
            onPress={() => setStatus(o.id, "READY")}
            style={{ padding: 12, borderRadius: 12, backgroundColor: disabled ? "#444" : "#111" }}
          >
            <Text style={{ color: "white", fontWeight: "900", textAlign: "center" }}>
              {disabled ? "Updating..." : "Mark Ready"}
            </Text>
          </Pressable>
        )}

        {o.status === "READY" && (
          <View style={{ padding: 12, borderRadius: 12, backgroundColor: "white", borderWidth: 1, borderColor: "#ddd" }}>
            <Text style={{ fontWeight: "900" }}>Ready for runner</Text>
            <Text style={{ opacity: 0.75, marginTop: 2 }}>Venue will mark Delivered.</Text>
          </View>
        )}

        <Text style={{ opacity: 0.5, fontSize: 12 }}>Order: {o.id}</Text>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "900" }}>Kitchen Dashboard</Text>

      {/* Restaurant switch */}
      <Text style={{ opacity: 0.7 }}>Restaurant:</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {RESTAURANTS.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => setRestaurantId(r.id)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: restaurantId === r.id ? "#111" : "#e5e5e5",
            }}
          >
            <Text style={{ color: restaurantId === r.id ? "white" : "black", fontWeight: "900" }}>
              {r.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        <TabButton k="NEW" label={`New (${counts.NEW})`} />
        <TabButton k="IN_PROGRESS" label={`In progress (${counts.IN_PROGRESS})`} />
        <TabButton k="READY" label={`Ready (${counts.READY})`} />
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <Text style={{ opacity: 0.6, marginTop: 16 }}>No orders in this view.</Text>
      ) : (
        <View style={{ gap: 12, marginTop: 10 }}>
          {filtered.map((o) => (
            <OrderCard key={o.id} o={o} />
          ))}
        </View>
      )}

      <Text style={{ opacity: 0.6, marginTop: 14 }}>
        Workflow: PLACED → ACCEPTED → PREPARING → READY (Venue → DELIVERED)
      </Text>
    </ScrollView>
  );
}
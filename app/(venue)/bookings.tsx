import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { theme } from "../../src/ui/theme";
import {
  listVenueBookings,
  ExistingBooking,
} from "../../src/domain/bookings/bookingQueries";
import { listBoothsForVenue, Booth } from "../../src/domain/booths/boothQueries";
import { updateBookingStatus } from "../../src/domain/bookings/bookingMutations";

const VENUE_ID = "venue_golfbar_cs";

type StatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "REJECTED" | "COMPLETED";
type EventFilter = "ALL" | "CASUAL" | "BIRTHDAY" | "CORPORATE";
type BoothFilter = "ALL" | string;

function StatusChip({ status }: { status: string }) {
  const bg =
    status === "CONFIRMED"
      ? "rgba(255,215,0,0.25)"
      : status === "PENDING"
      ? "rgba(255,255,255,0.10)"
      : status === "REJECTED"
      ? "rgba(255,255,255,0.08)"
      : status === "COMPLETED"
      ? "rgba(255,215,0,0.18)"
      : "rgba(255,255,255,0.10)";

  return (
    <View style={[styles.statusChip, { backgroundColor: bg }]}>
      <Text style={styles.statusChipText}>{status}</Text>
    </View>
  );
}

function BoothTypeChip({ type }: { type: string }) {
  return (
    <View style={styles.boothTypeChip}>
      <Text style={styles.boothTypeChipText}>
        {type === "ADVANCED" ? "ADVANCED" : "STANDARD"}
      </Text>
    </View>
  );
}

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MetaBadge({ text }: { text: string }) {
  return (
    <View style={styles.metaBadge}>
      <Text style={styles.metaBadgeText}>{text}</Text>
    </View>
  );
}

export default function VenueBookingsScreen() {
  const { width } = useWindowDimensions();
  const hPad = useMemo(() => (width < 380 ? 16 : 24), [width]);

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [bookings, setBookings] = useState<ExistingBooking[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [eventFilter, setEventFilter] = useState<EventFilter>("ALL");
  const [boothFilter, setBoothFilter] = useState<BoothFilter>("ALL");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [bookingRows, boothRows] = await Promise.all([
          listVenueBookings(VENUE_ID),
          listBoothsForVenue(VENUE_ID),
        ]);

        if (!mounted) return;
        setBookings(bookingRows);
        setBooths(boothRows);
      } catch (e) {
        console.log(e);
        Alert.alert("Load failed", "Could not load venue bookings.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const dates = useMemo(() => {
    const unique = Array.from(new Set(bookings.map((b) => b.bookingDate))).sort();
    return unique;
  }, [bookings]);

  const filtered = useMemo(() => {
    return bookings
      .filter((b) => (selectedDate === "ALL" ? true : b.bookingDate === selectedDate))
      .filter((b) => (statusFilter === "ALL" ? true : b.status === statusFilter))
      .filter((b) => (eventFilter === "ALL" ? true : b.eventType === eventFilter))
      .filter((b) => (boothFilter === "ALL" ? true : b.boothId === boothFilter))
      .sort((a, b) => {
        if (a.bookingDate !== b.bookingDate) return a.bookingDate.localeCompare(b.bookingDate);
        return a.startTime.localeCompare(b.startTime);
      });
  }, [bookings, selectedDate, statusFilter, eventFilter, boothFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, ExistingBooking[]> = {};

    for (const b of filtered) {
      if (!map[b.bookingDate]) map[b.bookingDate] = [];
      map[b.bookingDate].push(b);
    }

    return map;
  }, [filtered]);

  const onStatusChange = async (
    bookingId: string,
    status: "CONFIRMED" | "REJECTED" | "COMPLETED"
  ) => {
    try {
      setBusyId(bookingId);

      await updateBookingStatus(bookingId, status);

      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status,
                notificationStatus:
                  status === "CONFIRMED" || status === "REJECTED"
                    ? "PENDING"
                    : (b as any).notificationStatus,
              }
            : b
        )
      );
    } catch (e: any) {
      console.log(e);
      Alert.alert("Update failed", e?.message ?? "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = useMemo(
    () => filtered.filter((b) => b.status === "PENDING").length,
    [filtered]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: hPad,
          paddingTop: 18,
          paddingBottom: 28,
        }}
      >
        <View style={{ width: "100%", maxWidth: 860, alignSelf: "center" }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Venue Bookings</Text>
              <Text style={styles.sub}>
                Review bookings by day, booth, and event type.
              </Text>
            </View>

            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.92 }]}
            >
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={{ marginTop: 24 }}>
              <ActivityIndicator color={theme.colors.gold} />
            </View>
          ) : (
            <>
              <Text style={styles.section}>Filter by date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterRow}>
                  <Pill
                    label="ALL"
                    active={selectedDate === "ALL"}
                    onPress={() => setSelectedDate("ALL")}
                  />
                  {dates.map((d) => (
                    <Pill
                      key={d}
                      label={d}
                      active={selectedDate === d}
                      onPress={() => setSelectedDate(d)}
                    />
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.section}>Filter by status</Text>
              <View style={styles.filterRow}>
                {(["ALL", "PENDING", "CONFIRMED", "REJECTED", "COMPLETED"] as StatusFilter[]).map((s) => (
                  <Pill
                    key={s}
                    label={s}
                    active={statusFilter === s}
                    onPress={() => setStatusFilter(s)}
                  />
                ))}
              </View>

              <Text style={styles.section}>Filter by event</Text>
              <View style={styles.filterRow}>
                {(["ALL", "CASUAL", "BIRTHDAY", "CORPORATE"] as EventFilter[]).map((e) => (
                  <Pill
                    key={e}
                    label={e}
                    active={eventFilter === e}
                    onPress={() => setEventFilter(e)}
                  />
                ))}
              </View>

              <Text style={styles.section}>Filter by booth</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterRow}>
                  <Pill
                    label="ALL"
                    active={boothFilter === "ALL"}
                    onPress={() => setBoothFilter("ALL")}
                  />
                  {booths.map((b) => (
                    <Pill
                      key={b.id}
                      label={b.label}
                      active={boothFilter === b.id}
                      onPress={() => setBoothFilter(b.id)}
                    />
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.section}>Bookings</Text>
              <Text style={styles.helper}>
                {filtered.length} bookings • {pendingCount} pending
              </Text>

              {filtered.length === 0 ? (
                <Text style={styles.emptyText}>No bookings match the current filters.</Text>
              ) : (
                Object.entries(grouped).map(([date, rows]) => (
                  <View key={date} style={{ marginTop: 12 }}>
                    <Text style={styles.dayTitle}>{date}</Text>

                    <View style={{ gap: 12, marginTop: 10 }}>
                      {rows.map((b) => {
                        const busy = busyId === b.id;

                        return (
                          <View key={b.id} style={styles.card}>
                            <View style={styles.cardTop}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>
                                  {b.boothLabel} • {b.startTime}–{b.endTime}
                                </Text>
                                <Text style={styles.cardSub}>
                                  {b.customerName} • {b.customerEmail}
                                </Text>
                              </View>

                              <StatusChip status={b.status} />
                            </View>

                            <View style={styles.metaRow}>
                              <BoothTypeChip type={b.boothType} />
                              <MetaBadge text={b.eventType} />
                              <MetaBadge text={`${b.guestCount} guests`} />
                            </View>

                            {!!b.notes && (
                              <Text style={styles.notes}>Notes: {b.notes}</Text>
                            )}

                            <Text style={styles.smallText}>Phone: {b.customerPhone}</Text>
                            <Text style={styles.smallText}>Booking ID: {b.id}</Text>
                            <Text style={styles.smallText}>
                              Notification: {(b as any).notificationStatus ?? "NOT_REQUIRED"}
                            </Text>

                            {b.status === "PENDING" && (
                              <View style={styles.actionRow}>
                                <Pressable
                                  disabled={busy}
                                  onPress={() => onStatusChange(b.id, "CONFIRMED")}
                                  style={[styles.confirmBtn, busy && { opacity: 0.6 }]}
                                >
                                  <Text style={styles.confirmBtnText}>
                                    {busy ? "Updating..." : "Approve"}
                                  </Text>
                                </Pressable>

                                <Pressable
                                  disabled={busy}
                                  onPress={() => onStatusChange(b.id, "REJECTED")}
                                  style={[styles.rejectBtn, busy && { opacity: 0.6 }]}
                                >
                                  <Text style={styles.rejectBtnText}>Reject</Text>
                                </Pressable>
                              </View>
                            )}

                            {b.status === "CONFIRMED" && (
                              <View style={styles.actionRow}>
                                <Pressable
                                  disabled={busy}
                                  onPress={() => onStatusChange(b.id, "COMPLETED")}
                                  style={[styles.completeBtn, busy && { opacity: 0.6 }]}
                                >
                                  <Text style={styles.completeBtnText}>
                                    {busy ? "Updating..." : "Mark Completed"}
                                  </Text>
                                </Pressable>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { color: "white", fontSize: 26, fontWeight: "900" },
  sub: {
    color: "rgba(255,255,255,0.72)",
    marginTop: 6,
    fontWeight: "700",
    lineHeight: 20,
  },

  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  backBtnText: { color: "white", fontWeight: "900" },

  section: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 18,
    marginBottom: 8,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingRight: 4,
  },

  pill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: "transparent",
  },
  pillActive: { backgroundColor: theme.colors.gold },
  pillText: { color: theme.colors.goldSoft, fontWeight: "900" },
  pillTextActive: { color: "#111" },

  dayTitle: {
    color: theme.colors.goldSoft,
    fontWeight: "900",
    fontSize: 18,
  },

  helper: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "700",
    marginBottom: 8,
  },

  emptyText: {
    color: "rgba(255,255,255,0.72)",
    fontWeight: "700",
    marginTop: 8,
  },

  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  cardTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 16,
  },
  cardSub: {
    color: "rgba(255,255,255,0.72)",
    marginTop: 6,
    fontWeight: "700",
  },

  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  statusChipText: {
    color: "white",
    fontWeight: "900",
  },

  boothTypeChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.gold,
  },
  boothTypeChipText: {
    color: "#111",
    fontWeight: "900",
    fontSize: 12,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  metaBadgeText: {
    color: "white",
    fontWeight: "900",
    fontSize: 12,
  },

  notes: {
    color: "rgba(255,255,255,0.74)",
    marginTop: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  smallText: {
    color: "rgba(255,255,255,0.58)",
    marginTop: 8,
    fontWeight: "700",
    fontSize: 12,
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  confirmBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.gold,
  },
  confirmBtnText: {
    color: "#111",
    fontWeight: "900",
    textAlign: "center",
  },
  rejectBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#0d1f17",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  rejectBtnText: {
    color: "white",
    fontWeight: "900",
    textAlign: "center",
  },

  completeBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.gold,
  },
  completeBtnText: {
    color: "#111",
    fontWeight: "900",
    textAlign: "center",
  },
});
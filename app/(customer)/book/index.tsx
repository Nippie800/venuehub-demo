import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getDocs, collection, query, where } from "firebase/firestore";

import { theme } from "../../../src/ui/theme";
import { listBoothsForVenue, Booth } from "../../../src/domain/booths/boothQueries";
import { createBooking } from "../../../src/domain/bookings/bookingService";
import { hasBookingConflict } from "../../../src/domain/bookings/bookingQueries";
import { db } from "../../../src/lib/firebase";

const VENUE_ID = "venue_golfbar_cs";
const OPENING_HOUR = 10;
const CLOSING_HOUR = 23;
const DATE_WINDOW_DAYS = 10;

const EVENT_TYPES = ["CASUAL", "BIRTHDAY", "CORPORATE"] as const;
type EventType = (typeof EVENT_TYPES)[number];

type ExistingBooking = {
  id: string;
  venueId: string;
  boothId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
};

type DayAvailability = {
  date: string;
  label: string;
  shortDay: string;
  isFull: boolean;
  availableSlotsCount: number;
};

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatHumanDate(date: Date) {
  return date.toLocaleDateString([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTimeString(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addHoursToTime(startTime: string, durationHours: number) {
  return toTimeString(toMinutes(startTime) + durationHours * 60);
}

function overlaps(
  newStart: string,
  newEnd: string,
  existingStart: string,
  existingEnd: string
) {
  const aStart = toMinutes(newStart);
  const aEnd = toMinutes(newEnd);
  const bStart = toMinutes(existingStart);
  const bEnd = toMinutes(existingEnd);

  return aStart < bEnd && aEnd > bStart;
}

function isActiveBooking(status?: string) {
  return status !== "CANCELLED" && status !== "COMPLETED";
}

function getBaseTimeSlots(durationHours: 1 | 2) {
  const latestStart = CLOSING_HOUR - durationHours;
  const slots: string[] = [];

  for (let h = OPENING_HOUR; h <= latestStart; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }

  return slots;
}

async function getBookingsForDate(bookingDate: string): Promise<ExistingBooking[]> {
  const q = query(
    collection(db, "bookings"),
    where("venueId", "==", VENUE_ID),
    where("bookingDate", "==", bookingDate)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ExistingBooking, "id">),
  }));
}

function computeAvailableSlotsForBooth(input: {
  boothId: string;
  durationHours: 1 | 2;
  bookings: ExistingBooking[];
}) {
  const allSlots = getBaseTimeSlots(input.durationHours);

  const activeBookings = input.bookings.filter(
    (b) => b.boothId === input.boothId && isActiveBooking(b.status)
  );

  return allSlots.filter((slot) => {
    const candidateEnd = addHoursToTime(slot, input.durationHours);

    return !activeBookings.some((b) =>
      overlaps(slot, candidateEnd, b.startTime, b.endTime)
    );
  });
}

function computeDayAvailability(input: {
  booths: Booth[];
  bookings: ExistingBooking[];
}) {
  const oneHourSlots = getBaseTimeSlots(1);
  let availableSlotsCount = 0;

  for (const booth of input.booths) {
    const activeBookings = input.bookings.filter(
      (b) => b.boothId === booth.id && isActiveBooking(b.status)
    );

    for (const slot of oneHourSlots) {
      const candidateEnd = addHoursToTime(slot, 1);
      const blocked = activeBookings.some((b) =>
        overlaps(slot, candidateEnd, b.startTime, b.endTime)
      );

      if (!blocked) availableSlotsCount += 1;
    }
  }

  return {
    isFull: availableSlotsCount === 0,
    availableSlotsCount,
  };
}

export default function BookingScreen() {
  const { width } = useWindowDimensions();
  const hPad = useMemo(() => (width < 380 ? 16 : 24), [width]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const [booths, setBooths] = useState<Booth[]>([]);
  const [bookingsForSelectedDate, setBookingsForSelectedDate] = useState<ExistingBooking[]>([]);
  const [dateAvailability, setDateAvailability] = useState<DayAvailability[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [bookingDate, setBookingDate] = useState("");
  const [dateObj, setDateObj] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [startTime, setStartTime] = useState("");
  const [durationHours, setDurationHours] = useState<1 | 2>(1);

  const [selectedBoothId, setSelectedBoothId] = useState<string>("");
  const [eventType, setEventType] = useState<EventType>("CASUAL");
  const [guestCount, setGuestCount] = useState("2");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await listBoothsForVenue(VENUE_ID);
        if (!mounted) return;

        setBooths(data);
        if (data[0]) setSelectedBoothId(data[0].id);

        const today = new Date();
        setDateObj(today);
        setBookingDate(formatDate(today));
      } catch (e) {
        console.log(e);
        Alert.alert("Load failed", "Could not load booths.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!bookingDate) return;

      try {
        const bookings = await getBookingsForDate(bookingDate);
        if (!mounted) return;
        setBookingsForSelectedDate(bookings);
      } catch (e) {
        console.log(e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [bookingDate]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (booths.length === 0) return;

      try {
        setLoadingAvailability(true);

        const rows: DayAvailability[] = [];
        const base = new Date();

        for (let i = 0; i < DATE_WINDOW_DAYS; i++) {
          const d = new Date(base);
          d.setDate(base.getDate() + i);

          const date = formatDate(d);
          const bookings = await getBookingsForDate(date);
          const availability = computeDayAvailability({
            booths,
            bookings,
          });

          rows.push({
            date,
            label: formatHumanDate(d),
            shortDay: d.toLocaleDateString([], { weekday: "short" }),
            isFull: availability.isFull,
            availableSlotsCount: availability.availableSlotsCount,
          });
        }

        if (!mounted) return;
        setDateAvailability(rows);
      } catch (e) {
        console.log(e);
      } finally {
        if (mounted) setLoadingAvailability(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [booths]);

  const selectedBooth = useMemo(
    () => booths.find((b) => b.id === selectedBoothId) ?? null,
    [booths, selectedBoothId]
  );

  const selectedDayMeta = useMemo(
    () => dateAvailability.find((d) => d.date === bookingDate) ?? null,
    [dateAvailability, bookingDate]
  );

  const availableSlotsForSelectedBooth = useMemo(() => {
    if (!selectedBooth) return [];
    return computeAvailableSlotsForBooth({
      boothId: selectedBooth.id,
      durationHours,
      bookings: bookingsForSelectedDate,
    });
  }, [selectedBooth, durationHours, bookingsForSelectedDate]);

  useEffect(() => {
    if (!startTime) return;
    if (!availableSlotsForSelectedBooth.includes(startTime)) {
      setStartTime("");
    }
  }, [availableSlotsForSelectedBooth, startTime]);

  const endTime = useMemo(() => {
    if (!startTime) return "";
    return addHoursToTime(startTime, durationHours);
  }, [startTime, durationHours]);

  const validate = () => {
    if (!customerName.trim()) return "Enter customer name.";
    if (!customerEmail.trim() || !customerEmail.includes("@")) return "Enter a valid email.";
    if (!customerPhone.trim()) return "Enter phone number.";
    if (!bookingDate) return "Select a booking date.";
    if (selectedDayMeta?.isFull) return "That date is fully booked. Please choose another date.";
    if (!selectedBooth) return "Select a booth.";
    if (!startTime) return "Select a time slot.";
    if (!guestCount.trim() || Number(guestCount) <= 0) return "Enter valid guest count.";
    if (!endTime) return "Invalid time slot.";
    return null;
  };

  const onSubmit = async () => {
    if (saving) return;

    const error = validate();
    if (error) {
      Alert.alert("Missing info", error);
      return;
    }

    if (!selectedBooth) return;

    try {
      setSaving(true);

      const conflict = await hasBookingConflict({
        boothId: selectedBooth.id,
        bookingDate,
        startTime,
        endTime,
      });

      if (conflict) {
        Alert.alert(
          "Time unavailable",
          `${selectedBooth.label} is already booked during that time. Please choose another booth or time.`
        );
        return;
      }

      const bookingId = await createBooking({
        venueId: VENUE_ID,
        boothId: selectedBooth.id,
        boothLabel: selectedBooth.label,
        boothType: selectedBooth.type,

        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),

        bookingDate,
        startTime,
        endTime,
        durationHours,

        eventType,
        guestCount: Number(guestCount),
        notes,
      });

      router.replace({
        pathname: "/(customer)/book/confirm",
        params: { bookingId },
      });
    } catch (e: any) {
      console.log(e);
      Alert.alert("Booking failed", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const onPickDate = (selectedDate: Date) => {
    const nextDate = formatDate(selectedDate);
    setDateObj(selectedDate);
    setBookingDate(nextDate);
    setStartTime("");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: hPad,
          paddingTop: 18,
          paddingBottom: 28,
          gap: 12,
        }}
      >
        <View style={{ width: "100%", maxWidth: 640, alignSelf: "center" }}>
          <Text style={styles.title}>Book a Golf Booth</Text>
          <Text style={styles.sub}>
            Reserve your session at Golf Bar and optionally note your event type.
          </Text>

          {loading ? (
            <View style={{ marginTop: 24 }}>
              <ActivityIndicator color={theme.colors.gold} />
            </View>
          ) : (
            <>
              <Text style={styles.section}>Your details</Text>
              <Input value={customerName} onChangeText={setCustomerName} placeholder="Full name" />
              <Input value={customerEmail} onChangeText={setCustomerEmail} placeholder="Email" />
              <Input value={customerPhone} onChangeText={setCustomerPhone} placeholder="Phone number" />

              <Text style={styles.section}>Booking date</Text>

              {loadingAvailability ? (
                <Text style={styles.helper}>Checking availability…</Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {dateAvailability.map((d) => {
                    const active = bookingDate === d.date;

                    return (
                      <Pressable
                        key={d.date}
                        disabled={d.isFull}
                        onPress={() => {
                          const picked = new Date(`${d.date}T00:00:00`);
                          onPickDate(picked);
                        }}
                        style={[
                          styles.dateCard,
                          active && styles.dateCardActive,
                          d.isFull && styles.dateCardFull,
                        ]}
                      >
                        <Text style={[styles.dateCardDay, active && styles.dateCardTextActive]}>
                          {d.shortDay}
                        </Text>
                        <Text style={[styles.dateCardLabel, active && styles.dateCardTextActive]}>
                          {d.label}
                        </Text>
                        <Text
                          style={[
                            styles.dateCardStatus,
                            d.isFull && styles.dateCardStatusFull,
                            active && styles.dateCardTextActive,
                          ]}
                        >
                          {d.isFull
                            ? "Full"
                            : d.availableSlotsCount <= 5
                            ? "Busy"
                            : "Available"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[styles.input, { marginTop: 12, justifyContent: "center" }]}
              >
                <Text
                  style={{
                    color: bookingDate ? "white" : "rgba(255,255,255,0.45)",
                    fontWeight: "800",
                  }}
                >
                  {bookingDate || "Select a date"}
                </Text>
              </Pressable>

              {showDatePicker && (
                <DateTimePicker
                  value={dateObj}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) onPickDate(selectedDate);
                  }}
                />
              )}

              {selectedDayMeta && (
                <Text style={styles.helper}>
                  {selectedDayMeta.isFull
                    ? "Selected date is fully booked."
                    : `${selectedDayMeta.availableSlotsCount} slot${selectedDayMeta.availableSlotsCount === 1 ? "" : "s"} available across all booths.`}
                </Text>
              )}

              <Text style={styles.section}>Session length</Text>
              <View style={styles.rowWrap}>
                <SelectPill
                  label="1 hour"
                  active={durationHours === 1}
                  onPress={() => setDurationHours(1)}
                />
                <SelectPill
                  label="2 hours"
                  active={durationHours === 2}
                  onPress={() => setDurationHours(2)}
                />
              </View>

              <Text style={styles.section}>Choose booth</Text>

              {booths.length === 0 ? (
                <Text style={styles.emptyText}>No booths loaded yet.</Text>
              ) : (
                <View style={styles.rowWrap}>
                  {booths.map((b) => {
                    const active = selectedBoothId === b.id;

                    const boothSlots = computeAvailableSlotsForBooth({
                      boothId: b.id,
                      durationHours,
                      bookings: bookingsForSelectedDate,
                    });

                    return (
                      <Pressable
                        key={b.id}
                        onPress={() => {
                          setSelectedBoothId(b.id);
                          setStartTime("");
                        }}
                        style={[styles.boothCard, active && styles.boothCardActive]}
                      >
                        <Text style={[styles.boothTitle, active && styles.boothTitleActive]}>
                          {b.label}
                        </Text>

                        <Text style={[styles.boothType, active && styles.boothTypeActive]}>
                          {b.type === "ADVANCED" ? "Advanced bay" : "Standard bay"}
                        </Text>

                        <Text style={[styles.boothMeta, active && styles.boothMetaActive]}>
                          {b.type === "ADVANCED"
                            ? "Premium tracking experience"
                            : "Classic booth setup"}
                        </Text>

                        <Text style={[styles.boothAvailability, active && styles.boothTitleActive]}>
                          {boothSlots.length === 0
                            ? "No slots available"
                            : `${boothSlots.length} slot${boothSlots.length === 1 ? "" : "s"} available`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Text style={styles.section}>Choose time slot</Text>

              {selectedBooth && availableSlotsForSelectedBooth.length === 0 ? (
                <Text style={styles.emptyText}>
                  No time slots available for this booth on the selected date.
                </Text>
              ) : (
                <View style={styles.rowWrap}>
                  {availableSlotsForSelectedBooth.map((slot) => {
                    const active = startTime === slot;

                    return (
                      <Pressable
                        key={slot}
                        onPress={() => setStartTime(slot)}
                        style={[styles.slotPill, active && styles.slotPillActive]}
                      >
                        <Text style={[styles.slotPillText, active && styles.slotPillTextActive]}>
                          {slot}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Text style={styles.helper}>
                End time: {endTime || "—"}
              </Text>

              <Text style={styles.section}>Event type</Text>
              <View style={styles.rowWrap}>
                {EVENT_TYPES.map((e) => (
                  <SelectPill
                    key={e}
                    label={e}
                    active={eventType === e}
                    onPress={() => setEventType(e)}
                  />
                ))}
              </View>

              <Input
                value={guestCount}
                onChangeText={setGuestCount}
                placeholder="Guest count"
              />
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes (optional)"
                multiline
              />

              <Pressable
                disabled={saving}
                onPress={onSubmit}
                style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
              >
                <Text style={styles.primaryBtnText}>
                  {saving ? "Creating booking..." : "Create booking"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.45)"
      multiline={multiline}
      style={[
        styles.input,
        multiline && { minHeight: 88, textAlignVertical: "top" as const },
      ]}
    />
  );
}

function SelectPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { color: "white", fontSize: 26, fontWeight: "900" },
  sub: {
    color: "rgba(255,255,255,0.72)",
    marginTop: 6,
    fontWeight: "700",
    lineHeight: 20,
  },

  section: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 18,
    marginBottom: 8,
  },

  input: {
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#0d1f17",
    color: "white",
    fontWeight: "800",
  },

  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
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

  helper: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "700",
    marginTop: 8,
    lineHeight: 18,
  },

  emptyText: {
    color: "rgba(255,255,255,0.72)",
    fontWeight: "700",
    marginTop: 8,
    lineHeight: 18,
  },

  dateCard: {
    width: 116,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: "#1a3a2b",
  },
  dateCardActive: {
    backgroundColor: theme.colors.gold,
  },
  dateCardFull: {
    opacity: 0.45,
    backgroundColor: "#222",
    borderColor: "rgba(255,255,255,0.14)",
  },
  dateCardDay: {
    color: "rgba(255,255,255,0.72)",
    fontWeight: "900",
    fontSize: 12,
  },
  dateCardLabel: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
    marginTop: 8,
    lineHeight: 18,
  },
  dateCardStatus: {
    color: theme.colors.goldSoft,
    fontWeight: "900",
    fontSize: 12,
    marginTop: 8,
  },
  dateCardStatusFull: {
    color: "rgba(255,255,255,0.65)",
  },
  dateCardTextActive: {
    color: "#111",
  },

  boothCard: {
    minWidth: 150,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: "#1a3a2b",
    flexShrink: 1,
  },
  boothCardActive: {
    backgroundColor: theme.colors.gold,
  },
  boothTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 15,
  },
  boothTitleActive: {
    color: "#111",
  },
  boothType: {
    color: "rgba(255,255,255,0.75)",
    fontWeight: "700",
    marginTop: 6,
  },
  boothTypeActive: {
    color: "#111",
  },
  boothMeta: {
    color: "rgba(255,255,255,0.65)",
    fontWeight: "700",
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
  },
  boothMetaActive: {
    color: "#111",
  },
  boothAvailability: {
    color: theme.colors.goldSoft,
    fontWeight: "900",
    marginTop: 10,
    fontSize: 12,
  },

  slotPill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#0d1f17",
  },
  slotPillActive: {
    backgroundColor: theme.colors.gold,
    borderColor: "rgba(0,0,0,0.12)",
  },
  slotPillText: {
    color: "white",
    fontWeight: "900",
  },
  slotPillTextActive: {
    color: "#111",
  },

  primaryBtn: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.gold,
  },
  primaryBtnText: {
    color: "#111",
    fontWeight: "900",
    textAlign: "center",
  },
});
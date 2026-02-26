import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  useWindowDimensions,
  Image,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { listRestaurantsForVenue } from "../../../../../../src/domain/restaurants/restaurantQueries";
import { theme } from "../../../../../../src/ui/theme";
import { Header, Pill, GoldBadge } from "../../../../../../src/ui/components";

import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../../../../../../src/lib/firebase"; // ✅ ensure storage is exported

type Restaurant = {
  id: string;
  name: string;
  prepTimeMins?: number;
  logoPath?: string | null; // e.g. "restaurants/smoke_daddys/smokedaddylogo.jpg"
  logoUrl?: string | null;  // resolved download URL
};

function normalizeStoragePath(input?: string | null) {
  if (!input) return null;

  // If someone accidentally stored gs://bucket/..., convert to path
  if (input.startsWith("gs://")) {
    const parts = input.split("/");
    return parts.slice(3).join("/");
  }

  return input;
}

async function resolveLogoUrl(r: any): Promise<string | null> {
  // Prefer direct URL if you ever store it
  if (r?.logoUrl) return r.logoUrl;

  const path = normalizeStoragePath(r?.logoPath ?? null);
  if (!path) return null;

  try {
    return await getDownloadURL(ref(storage, path));
  } catch {
    return null;
  }
}

export default function VenueTableRestaurants() {
  const { venueId, tableId } = useLocalSearchParams<{
    venueId: string;
    tableId: string;
  }>();

  const { width } = useWindowDimensions();
  const hPad = useMemo(() => (width < 380 ? 16 : 24), [width]);

  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!venueId) return;

      try {
        setLoading(true);

        const data = await listRestaurantsForVenue(venueId);
        if (!mounted) return;

        // Map + resolve logo URLs in parallel
        const mapped: Restaurant[] = await Promise.all(
          (data ?? []).map(async (r: any) => {
            const logoUrl = await resolveLogoUrl(r);

            return {
              id: r.id,
              name: r.name,
              prepTimeMins: r.prepTimeMins ?? 20,
              logoPath: r.logoPath ?? null,
              logoUrl,
            };
          })
        );

        setRestaurants(mapped);

        // Prefetch logos for a snappy feel
        mapped.forEach((x) => {
          if (x.logoUrl) Image.prefetch(x.logoUrl);
        });
      } catch (e) {
        console.log(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [venueId]);

  if (!venueId || !tableId) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.bg }]}>
        <View style={[styles.center, { paddingHorizontal: 24 }]}>
          <Text style={[styles.titleWhite]}>Missing route parameters</Text>
          <Text style={[styles.bodyWhite, { opacity: 0.8 }]}>
            Expected /venue/[venueId]/table/[tableId]
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: hPad, paddingTop: 18, paddingBottom: 24 },
        ]}
      >
        <View style={styles.container}>
          <Header title="GOLF BAR" subtitle="Order food from partner kitchens inside the venue" />

          <View style={{ marginTop: 12 }}>
            <Pill label={`Table ${tableId}`} />
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Choose a restaurant</Text>

          {loading ? (
            <View style={{ marginTop: 18 }}>
              <ActivityIndicator color={theme.colors.gold} />
            </View>
          ) : restaurants.length === 0 ? (
            <Text style={[styles.bodyWhite, { marginTop: 12, opacity: 0.85 }]}>
              No restaurants available right now.
            </Text>
          ) : (
            <View style={{ marginTop: 12 }}>
              {restaurants.map((r, idx) => (
                <Pressable
                  key={r.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(customer)/restaurant/[restaurantId]",
                      params: { restaurantId: r.id, venueId, tableId },
                    })
                  }
                  style={({ pressed }) => [
                    styles.tile,
                    pressed && { opacity: 0.92 },
                    idx !== 0 && { marginTop: 12 },
                  ]}
                >
                  {/* Logo */}
                  <View style={styles.logoBox}>
                    {r.logoUrl ? (
                      <Image
                        source={{ uri: r.logoUrl }}
                        style={styles.logoImg}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.logoLetter}>
                        {r.name?.[0]?.toUpperCase() ?? "R"}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.tileTitle}>{r.name}</Text>
                    <Text style={styles.tileSub}>
                      Est. prep {r.prepTimeMins ?? 20} mins • In-venue delivery
                    </Text>

                    <View style={styles.badgeRow}>
                      <GoldBadge text="Kitchen routed" />
                      <GoldBadge text="Premium partner" />
                    </View>
                  </View>

                  <Text style={styles.chev}>›</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={[styles.bodyWhite, { marginTop: 18, opacity: 0.65 }]}>
            Demo tip: seeded venueId = venue_golfbar_cs and tableId like G7.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  container: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  center: { flex: 1, justifyContent: "center" },

  titleWhite: { color: "white", fontSize: 20, fontWeight: "900" },
  bodyWhite: { color: "white", fontSize: 14 },

  sectionTitle: { color: "white", fontSize: 18, fontWeight: "900" },

  tile: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#1a3a2b",
    borderWidth: 1,
    borderColor: theme.colors.gold,
    flexDirection: "row",
    alignItems: "center",
  },

  logoBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#0d1f17",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.gold,
    marginRight: 14,
    overflow: "hidden",
  },
  logoImg: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0d1f17", // premium placeholder while image loads
  },
  logoLetter: {
    color: theme.colors.goldSoft,
    fontWeight: "900",
    fontSize: 18,
  },

  tileTitle: { color: "white", fontSize: 16, fontWeight: "900" },
  tileSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 4 },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },

  chev: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "900",
    marginLeft: 10,
    fontSize: 18,
  },
});
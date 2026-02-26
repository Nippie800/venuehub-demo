import { useLocalSearchParams } from "expo-router";

export function useCustomerContext() {
  const { venueId, tableId } = useLocalSearchParams<{
    venueId: string;
    tableId: string;
  }>();

  if (!venueId || !tableId) {
    throw new Error("Missing venueId or tableId in route");
  }

  return { venueId, tableId };
}
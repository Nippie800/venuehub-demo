import AsyncStorage from "@react-native-async-storage/async-storage";

export type Role = "customer" | "venue" | "kitchen";

const KEY = "venuehub.roleLocks.v1";

type Locks = {
  venueUnlocked?: boolean;
  kitchenUnlocked?: boolean;
};

async function readLocks(): Promise<Locks> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Locks) : {};
}

async function writeLocks(next: Locks) {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function isUnlocked(role: Role) {
  const locks = await readLocks();
  if (role === "venue") return !!locks.venueUnlocked;
  if (role === "kitchen") return !!locks.kitchenUnlocked;
  return true; // customer always unlocked
}

export async function unlock(role: Role) {
  const locks = await readLocks();
  const next: Locks = { ...locks };
  if (role === "venue") next.venueUnlocked = true;
  if (role === "kitchen") next.kitchenUnlocked = true;
  await writeLocks(next);
}

export async function lockAll() {
  await writeLocks({ venueUnlocked: false, kitchenUnlocked: false });
}
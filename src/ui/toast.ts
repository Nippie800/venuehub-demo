import { Platform, ToastAndroid } from "react-native";

export function toast(msg: string) {
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
  else console.log("TOAST:", msg); // for iOS demo, keep silent (or use Alert if you want)
}
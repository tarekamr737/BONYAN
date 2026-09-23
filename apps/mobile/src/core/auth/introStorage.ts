const key = "bonyan.intro.completed.v2";

// This non-private installation preference survives sign-out and web tab closure.
export async function readIntroCompleted(): Promise<boolean> {
  if (typeof globalThis.localStorage !== "undefined") return globalThis.localStorage.getItem(key) === "true";
  return (await import("expo-secure-store")).getItemAsync(key).then(value => value === "true");
}

export async function storeIntroCompleted(): Promise<void> {
  if (typeof globalThis.localStorage !== "undefined") globalThis.localStorage.setItem(key, "true");
  else await (await import("expo-secure-store")).setItemAsync(key, "true");
}

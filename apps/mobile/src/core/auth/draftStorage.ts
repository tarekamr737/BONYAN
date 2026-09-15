let writes: Promise<void> = Promise.resolve();

export async function readCoachingDraft(slot = "setup"): Promise<string | null> {
  const key = `bonyan.coaching.${slot}`;
  await writes;
  if (typeof globalThis.sessionStorage !== "undefined") return globalThis.sessionStorage.getItem(key);
  return (await import("expo-secure-store")).getItemAsync(key);
}

// Serial writes ensure that signing out removes any pending draft writes as well.
export function storeCoachingDraft(value: string | null, slot = "setup"): Promise<void> {
  const key = `bonyan.coaching.${slot}`;
  writes = writes.catch(() => {}).then(async () => {
    if (typeof globalThis.sessionStorage !== "undefined") {
      if (value === null) globalThis.sessionStorage.removeItem(key);
      else globalThis.sessionStorage.setItem(key, value);
    } else {
      const storage = await import("expo-secure-store");
      if (value === null) await storage.deleteItemAsync(key);
      else await storage.setItemAsync(key, value);
    }
  });
  return writes;
}

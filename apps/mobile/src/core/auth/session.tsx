import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const sessionStorageKey = "bonyan.auth.access-token";

type AuthSession = {
  accessToken: string | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  signIn: (accessToken: string) => Promise<void>;
  signOut: () => Promise<void>;
};

let currentAccessToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

const AuthSessionContext = createContext<AuthSession | null>(null);

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setSessionAccessToken(token: string | null): void {
  currentAccessToken = token;
  listeners.forEach((listener) => listener(token));
}

async function readStoredAccessToken(): Promise<string | null> {
  if (typeof globalThis.sessionStorage !== "undefined") {
    return globalThis.sessionStorage.getItem(sessionStorageKey);
  }
  const secureStore = await import("expo-secure-store");
  return secureStore.getItemAsync(sessionStorageKey);
}

async function storeAccessToken(token: string): Promise<void> {
  if (typeof globalThis.sessionStorage !== "undefined") {
    globalThis.sessionStorage.setItem(sessionStorageKey, token);
    return;
  }
  const secureStore = await import("expo-secure-store");
  await secureStore.setItemAsync(sessionStorageKey, token);
}

async function removeStoredAccessToken(): Promise<void> {
  if (typeof globalThis.sessionStorage !== "undefined") {
    globalThis.sessionStorage.removeItem(sessionStorageKey);
    return;
  }
  const secureStore = await import("expo-secure-store");
  await secureStore.deleteItemAsync(sessionStorageKey);
}

export async function clearSession(): Promise<void> {
  setSessionAccessToken(null);
  try {
    await removeStoredAccessToken();
  } catch {
    // The active session is still cleared even if device storage is unavailable.
  }
}

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessToken] = useState(currentAccessToken);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    listeners.add(setAccessToken);
    return () => {
      listeners.delete(setAccessToken);
    };
  }, []);

  useEffect(() => {
    let active = true;
    void readStoredAccessToken()
      .then((storedToken) => {
        if (active) {
          setSessionAccessToken(storedToken);
        }
      })
      .catch(() => {
        if (active) {
          setSessionAccessToken(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsRestoring(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (token: string) => {
    const normalized = token.trim();
    if (!normalized) {
      throw new Error("An access token is required.");
    }
    await storeAccessToken(normalized);
    setSessionAccessToken(normalized);
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
  }, []);

  const session = useMemo<AuthSession>(
    () => ({
      accessToken,
      isAuthenticated: accessToken !== null,
      isRestoring,
      signIn,
      signOut,
    }),
    [accessToken, isRestoring, signIn, signOut],
  );

  return (
    <AuthSessionContext.Provider value={session}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession(): AuthSession {
  const session = useContext(AuthSessionContext);
  if (!session) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }
  return session;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function validateApiUrl(value, { release }) {
  const candidate = value?.trim();
  if (!candidate) {
    if (release) throw new Error("EXPO_PUBLIC_API_URL is required for release builds.");
    return "http://127.0.0.1:8000";
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("EXPO_PUBLIC_API_URL must be an absolute HTTP(S) URL.");
  }
  if (!release && ["http:", "https:"].includes(parsed.protocol)) {
    return candidate.replace(/\/+$/, "");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("EXPO_PUBLIC_API_URL must use HTTPS for release builds.");
  }
  if (LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error("EXPO_PUBLIC_API_URL cannot use a loopback host for release builds.");
  }
  return candidate.replace(/\/+$/, "");
}

function requireReleaseApiUrl(environment = process.env) {
  return validateApiUrl(environment.EXPO_PUBLIC_API_URL, { release: true });
}

module.exports = { requireReleaseApiUrl, validateApiUrl };

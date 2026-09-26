const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function resolveApiBaseUrl(configuredUrl: string | undefined, platform: string): string {
  const baseUrl = (configuredUrl?.trim() || "http://127.0.0.1:8000").replace(/\/+$/, "");
  if (platform !== "android") return baseUrl;

  const url = new URL(baseUrl);
  if (localHosts.has(url.hostname.toLowerCase())) {
    url.hostname = "10.0.2.2";
    return url.toString().replace(/\/+$/, "");
  }
  return baseUrl;
}

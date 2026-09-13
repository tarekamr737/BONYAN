import { fetch } from "expo/fetch";

export function uploadFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}

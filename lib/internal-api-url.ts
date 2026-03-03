import { headers } from "next/headers";

const getFirstForwardedValue = (value: string | null) => {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
};

export async function getServerRequestOrigin() {
  const requestHeaders = await headers();
  const proto = getFirstForwardedValue(requestHeaders.get("x-forwarded-proto")) ?? "http";
  const host =
    getFirstForwardedValue(requestHeaders.get("x-forwarded-host")) ??
    getFirstForwardedValue(requestHeaders.get("host"));

  if (!host) {
    throw new Error("Request host header is missing for server fetch.");
  }

  return `${proto}://${host}`;
}

export async function toInternalApiUrl(path: string) {
  const origin = await getServerRequestOrigin();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, origin).toString();
}

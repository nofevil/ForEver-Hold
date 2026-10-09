/**
 * The public origin of this request, from the proxy host when present.
 * Browsers cannot set `x-forwarded-host`, so this is the site the user opened.
 */
export function publicOriginFrom(request?: Request | null): string | null {
  if (!request) return null;
  const rawHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const host = rawHost?.split(",")[0]?.trim().replace(/\.$/, "");
  if (!host) return null;
  const rawProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const proto =
    rawProto === "http" || rawProto === "https"
      ? rawProto
      : /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
        ? "http"
        : "https";
  try {
    return new URL(`${proto}://${host}`).origin;
  } catch {
    return null;
  }
}

/**
 * Mobile Safari, home-screen apps, and in-app browsers often send `Origin: null`
 * on a same-origin POST. A cross-site page cannot set `Sec-Fetch-Site` to
 * `same-origin` / `none`, and cannot fake a Referer for this host.
 */
export function mayClaimSelf(headers: Headers, selfOrigin: string): boolean {
  const site = headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "none") return true;
  if (site === "cross-site" || site === "same-site") return false;
  const referer = headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).origin === selfOrigin;
  } catch {
    return false;
  }
}

/**
 * Give Better Auth an origin it can check. `Origin: null` is truthy, so Better
 * Auth ignores a good Referer and answers "Missing or null Origin" — which is
 * what phones show as an invalid-origin sign-in failure.
 */
export function prepareAuthRequest(request: Request): Request {
  const self = publicOriginFrom(request);
  if (!self) return request;
  const origin = request.headers.get("origin");
  if (origin && origin !== "null") {
    try {
      if (new URL(origin).origin === self) return request;
    } catch {
      /* unparseable origin — leave it for Better Auth to reject */
    }
    return request;
  }
  if (!mayClaimSelf(request.headers, self)) return request;
  const headers = new Headers(request.headers);
  headers.set("origin", self);
  return new Request(request, { headers });
}

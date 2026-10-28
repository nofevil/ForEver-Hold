import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import { prepareAuthRequest } from "@/lib/auth/request-origin";
import { auth } from "@/lib/auth/server";

function applyAuthCookies(response: Response) {
  const lines =
    typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  for (const line of lines) {
    const semi = line.indexOf(";");
    const pair = (semi === -1 ? line : line.slice(0, semi)).trim();
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    let value = pair.slice(eq + 1).trim();
    if (value.includes("%")) {
      try {
        value = decodeURIComponent(value);
      } catch {
        /* keep the raw value */
      }
    }
    const opts: {
      path: string;
      secure: boolean;
      sameSite: "lax" | "strict" | "none";
      httpOnly?: boolean;
      maxAge?: number;
    } = { path: "/", secure: true, sameSite: "lax" };
    for (const raw of (semi === -1 ? "" : line.slice(semi + 1)).split(";")) {
      const attr = raw.trim();
      if (!attr) continue;
      const aeq = attr.indexOf("=");
      const key = (aeq === -1 ? attr : attr.slice(0, aeq)).trim().toLowerCase();
      const val = aeq === -1 ? "" : attr.slice(aeq + 1).trim();
      if (key === "max-age" && val) opts.maxAge = Number(val);
      else if (key === "httponly") opts.httpOnly = true;
      else if (key === "samesite") {
        const site = val.toLowerCase();
        if (site === "lax" || site === "strict" || site === "none") opts.sameSite = site;
      }
    }
    if (name.startsWith("__Host-")) {
      opts.path = "/";
      opts.secure = true;
    }
    try {
      setCookie(name, value, opts);
    } catch (err) {
      console.error("auth cookie", name, err);
    }
  }
}

async function handle(request: Request) {
  const response = await auth.handler(prepareAuthRequest(request));
  applyAuthCookies(response);
  return response;
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
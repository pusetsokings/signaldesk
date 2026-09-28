import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Operator gate for the single-owner dashboard and its API: HTTP Basic Auth
 * against DASHBOARD_USER (default "operator") / DASHBOARD_PASSWORD. The
 * browser prompts once and resends the credentials on same-origin fetches,
 * so the dashboard components need no changes.
 *
 * Not gated (see matcher): /api/cron/scan (Bearer CRON_SECRET) and
 * /api/telegram/webhook (TELEGRAM_WEBHOOK_SECRET header) keep their own auth.
 *
 * Fails closed: without DASHBOARD_PASSWORD every gated route returns 503,
 * except under `next dev`.
 */

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function safeEqual(a: string, b: string) {
  return timingSafeEqual(digest(a), digest(b));
}

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="SignalDesk", charset="UTF-8"' }
  });
}

export function proxy(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === "development") return NextResponse.next();
    return new NextResponse("Dashboard auth is not configured.", { status: 503 });
  }
  const user = process.env.DASHBOARD_USER || "operator";

  const header = request.headers.get("authorization") || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return unauthorized();

  let decoded = "";
  try {
    decoded = atob(encoded);
  } catch {
    return unauthorized();
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) return unauthorized();

  const userOk = safeEqual(decoded.slice(0, separator), user);
  const passwordOk = safeEqual(decoded.slice(separator + 1), password);
  if (!userOk || !passwordOk) return unauthorized();

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/cron/scan|api/telegram/webhook|_next/static|_next/image|favicon.ico).*)"
  ]
};

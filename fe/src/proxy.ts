import { NextResponse, type NextRequest } from "next/server";

/*
 * The /api rewrite (next.config.ts) forwards the browser's headers, and browsers send Origin
 * on every POST. The backend only allows the deployed app's origin, so localhost and preview
 * deployments got 403 E_ACCESS. Dropping Origin makes the call server to server, which the
 * backend allows.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("origin");
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: "/api/:path*" };

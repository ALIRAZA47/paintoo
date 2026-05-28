import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifyTokenEdge } from "@/lib/auth-edge";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/).*)"],
};

const PUBLIC_PATHS = new Set(["/login", "/api/login"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return new NextResponse(
      "AUTH_SECRET env var is not configured. See .env.example.",
      { status: 500 },
    );
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const ok = await verifyTokenEdge(token, secret);
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

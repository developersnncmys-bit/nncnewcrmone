import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "./lib/token";

/**
 * 1. Customer domains: abctravels.nnccrm.com/<path>  →  internally /w/abctravels/<path>
 * 2. Customer CRM pages need a login (each CRM has its own /login page).
 * 3. The admin panel is visible only to the logged-in owner (404 for everyone else).
 */
export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = (req.headers.get("host") || "").toLowerCase();
  const root = (process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000").toLowerCase();

  let path = url.pathname;
  let onSubdomain = false;
  if (host !== root && host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1));
    if (sub && sub !== "www" && !path.startsWith("/api/") && !path.startsWith("/pay/") && !path.startsWith(`/w/${sub}`)) {
      path = `/w/${sub}${path === "/" ? "" : path}`;
      onSubdomain = true;
    }
  }

  const session = await verifyToken(req.cookies.get("session")?.value);

  // ---- owner-only admin panel ----
  if (path === "/admin" || path.startsWith("/admin/")) {
    if (path !== "/admin/login" && session?.role !== "superadmin") {
      const nf = req.nextUrl.clone();
      nf.pathname = "/__not-found";
      return NextResponse.rewrite(nf, { status: 404 });
    }
  }

  // ---- customer CRM: /w/<sub>/... (login page is public) ----
  const m = path.match(/^\/w\/([^/]+)(\/.*)?$/);
  if (m && m[2] !== "/login" && !session) {
    const login = req.nextUrl.clone();
    login.pathname = onSubdomain ? "/login" : `/w/${m[1]}/login`;
    login.search = "";
    login.searchParams.set("next", url.pathname + url.search);
    return NextResponse.redirect(login);
  }

  if (onSubdomain) {
    url.pathname = path;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};

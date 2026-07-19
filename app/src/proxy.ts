import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renombró `middleware` a `proxy`. Este archivo refresca la
// sesión de Supabase (cookies) en cada request y protege las rutas
// autenticadas redirigiendo a /login si no hay sesión.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const isOnboardingRoute = request.nextUrl.pathname.startsWith("/onboarding");

  if (!user && !isAuthRoute && !isAuthCallback) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (user && !isAuthCallback && !isApiRoute && !isOnboardingRoute) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("onboarding_completed_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.onboarding_completed_at) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  if (user && isOnboardingRoute) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("onboarding_completed_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.onboarding_completed_at) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthUrl } from "@/lib/google/oauth";

// Inicia el flujo OAuth: redirige a Google para que el usuario autorice
// acceso de solo lectura a su Calendar. El redirect_uri se deriva del origin
// de la request actual — debe estar registrado tal cual en Google Cloud
// Console (Authorized redirect URIs) para cada entorno donde corra la app.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${request.nextUrl.origin}/api/google/callback`;

  const response = NextResponse.redirect(buildGoogleAuthUrl(redirectUri, state));
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}

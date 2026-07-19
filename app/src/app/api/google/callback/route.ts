import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, fetchGoogleUserEmail } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const storedState = request.cookies.get("google_oauth_state")?.value;

  const agendaUrl = new URL("/agenda", request.url);

  if (error) {
    agendaUrl.searchParams.set("google_error", error);
    return NextResponse.redirect(agendaUrl);
  }
  if (!code || !state || state !== storedState) {
    agendaUrl.searchParams.set("google_error", "state_mismatch");
    return NextResponse.redirect(agendaUrl);
  }

  try {
    const redirectUri = `${request.nextUrl.origin}/api/google/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (!tokens.refresh_token) {
      // Pasa si el usuario ya había autorizado antes sin pasar por "prompt=consent"
      // con esta misma app+cuenta. buildGoogleAuthUrl ya fuerza prompt=consent para
      // evitar esto, pero se valida igual por robustez.
      agendaUrl.searchParams.set("google_error", "no_refresh_token");
      return NextResponse.redirect(agendaUrl);
    }

    const email = await fetchGoogleUserEmail(tokens.access_token);
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: dbError } = await supabase.from("google_calendar_connections").upsert(
      {
        owner_id: user.id,
        google_email: email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokenExpiresAt,
        scope: tokens.scope,
        calendar_id: "primary",
      },
      { onConflict: "owner_id" }
    );
    if (dbError) throw new Error(dbError.message);

    agendaUrl.searchParams.set("google_connected", "1");
    const response = NextResponse.redirect(agendaUrl);
    response.cookies.delete("google_oauth_state");
    return response;
  } catch (err) {
    agendaUrl.searchParams.set("google_error", err instanceof Error ? err.message : "unknown");
    return NextResponse.redirect(agendaUrl);
  }
}

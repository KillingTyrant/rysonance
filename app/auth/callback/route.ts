import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_NEXT = "/onboarding";

function errorRedirect(origin: string, message: string) {
  return NextResponse.redirect(
    `${origin}/auth/error?error=${encodeURIComponent(message)}`,
  );
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Solo path relativi: evita che un `next` manipolato diventi un open redirect.
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : DEFAULT_NEXT;

  // Il provider annulla il flusso (es. consenso negato) rimandando qui con un errore.
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return errorRedirect(origin, providerError);
  }

  if (!code) {
    return errorRedirect(origin, "Codice di autorizzazione mancante");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return errorRedirect(origin, error.message);
  }

  // I cookie di sessione scritti dallo scambio viaggiano su questa risposta, quindi
  // serve NextResponse.redirect e non `redirect()` di next/navigation.
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (process.env.NODE_ENV !== "development" && forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}

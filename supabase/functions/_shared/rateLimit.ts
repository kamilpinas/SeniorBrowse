// Shared per-IP rate limiter for the public edge functions (audit #3).
//
// Backed by the public.check_rate_limit() Postgres function. Fails OPEN on any
// limiter error — a problem with the limiter itself must never block
// legitimate traffic (especially browsing, which depends on check-url).

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

/** Best-effort client IP from the edge proxy headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  return req.headers.get("x-real-ip") ?? "unknown"
}

/**
 * Returns true when the request is allowed, false when it exceeds the limit.
 * `key` should identify both the endpoint and the caller, e.g.
 * `check-url:1.2.3.4`.
 */
export async function underRateLimit(
  supabase: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      console.warn("[rateLimit] failing open:", error.message)
      return true
    }
    return data === true
  } catch (err) {
    console.warn("[rateLimit] failing open:", err)
    return true
  }
}

/** Convenience: builds a service-role client for limiter use. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SBASE_URL")!,
    Deno.env.get("SBASE_SERVICE_ROLE_KEY")!,
  )
}

/** Standard 429 response with the shared CORS headers. */
export function tooManyRequests(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down." }),
    {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  )
}

// Edge function: POST /check-url
// Proxies Google Safe Browsing v4 so the API key lives server-side and is
// never shipped inside the extension bundle.
//
// Request body:  { url: string }
// Response body: { result: "safe" | "warn" | "block" }
//
// Always fails open ("safe") on any error so a Supabase outage never blocks
// the senior from browsing.

import {
  clientIp,
  serviceClient,
  tooManyRequests,
  underRateLimit,
} from "../_shared/rateLimit.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SB_ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find"

// Generous enough for real browsing (the extension caches per-URL, so this is
// roughly unique-URLs-per-minute), tight enough to cap quota abuse.
const RATE_LIMIT = 100
const RATE_WINDOW_SECONDS = 60

// Social engineering → soft warn (user can bypass).
// Malware / PHA / unwanted software → hard block.
const WARN_ONLY_TYPES = new Set(["SOCIAL_ENGINEERING"])

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // Per-IP throttle — this endpoint bills against the Safe Browsing quota.
  const allowed = await underRateLimit(
    serviceClient(),
    `check-url:${clientIp(req)}`,
    RATE_LIMIT,
    RATE_WINDOW_SECONDS,
  )
  if (!allowed) return tooManyRequests(corsHeaders)

  try {
    const { url } = (await req.json()) as { url?: string }

    if (!url || typeof url !== "string") {
      return json({ result: "safe" })
    }

    const apiKey = Deno.env.get("SAFE_BROWSING_KEY")
    if (!apiKey) {
      // Key not configured in Supabase secrets — fail open.
      console.warn("[check-url] SAFE_BROWSING_KEY not set")
      return json({ result: "safe" })
    }

    const sbRes = await fetch(`${SB_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "seniorbrowse", clientVersion: "1.0.0" },
        threatInfo: {
          threatTypes: [
            "MALWARE",
            "SOCIAL_ENGINEERING",
            "POTENTIALLY_HARMFUL_APPLICATION",
            "UNWANTED_SOFTWARE",
          ],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }],
        },
      }),
    })

    if (!sbRes.ok) {
      console.warn("[check-url] Safe Browsing API error:", sbRes.status)
      return json({ result: "safe" })
    }

    const data = (await sbRes.json()) as {
      matches?: { threatType: string }[]
    }

    if (!data.matches || data.matches.length === 0) {
      return json({ result: "safe" })
    }

    const result = data.matches.every((m) => WARN_ONLY_TYPES.has(m.threatType))
      ? "warn"
      : "block"

    return json({ result })
  } catch (err) {
    // Any unexpected error → fail open.
    console.error("[check-url] unexpected error:", err)
    return json({ result: "safe" })
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

// Edge function: POST /register-license
// Called by the extension during onboarding when the caregiver enters their email.
//
// Logic:
//   - New email + new device → create a 7-day trial record, return the license key
//   - Email exists + active subscription → return current license key (recovery)
//   - Email exists + trial already used → 403 reason:"email"
//   - Device already used a trial (different email) → 403 reason:"device"
//   - Disposable/throwaway email domain → 403 reason:"email"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { clientIp, tooManyRequests, underRateLimit } from "../_shared/rateLimit.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Registration happens once per install — a low ceiling blocks trial spam
// while leaving room for a few legitimate retries / shared-NAT households.
const RATE_LIMIT = 10
const RATE_WINDOW_SECONDS = 3600

// Common disposable / throwaway email domains.
// This list catches the most popular services; extend as needed.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
  "guerrillamail.de", "guerrillamail.biz", "guerrillamail.info", "guerrillamailblock.com",
  "grr.la", "sharklasers.com", "spam4.me", "trashmail.com", "trashmail.me",
  "trashmail.net", "trashmail.at", "trashmail.io", "trashmail.org",
  "temp-mail.org", "temp-mail.io", "tempmail.com", "tempmail.net", "tempmail.org",
  "tempinbox.com", "tempr.email", "throwam.com", "throwaway.email",
  "10minutemail.com", "10minutemail.net", "10minutemail.org", "10minemail.com",
  "yopmail.com", "yopmail.fr", "yopmail.net", "cool.fr.nf", "jetable.fr.nf",
  "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr",
  "courriel.fr.nf", "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf",
  "fakeinbox.com", "fakeinbox.net", "fakeemail.com",
  "dispostable.com", "discard.email", "discardmail.com", "discardmail.de",
  "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",
  "mailnull.com", "maildrop.cc", "mailnesia.com", "mailnull.com",
  "spamherelots.com", "spamhereplease.com", "heresmyemail.com",
  "getonemail.com", "getonemail.net", "mt2015.com", "mt2014.com",
  "mt2016.com", "mt2017.com",
  "getnada.com", "nada.email", "nadaemail.com",
  "anonaddy.com", "anonaddy.me", "anonaddy.net",
  "simplelogin.io", "simplelogin.co",
  "33mail.com", "spamgourmet.com",
])

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? ""
  return DISPOSABLE_DOMAINS.has(domain)
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get("SBASE_URL")!,
    Deno.env.get("SBASE_SERVICE_ROLE_KEY")!,
  )

  // Per-IP throttle — blocks automated trial-creation spam.
  const allowed = await underRateLimit(
    supabase,
    `register-license:${clientIp(req)}`,
    RATE_LIMIT,
    RATE_WINDOW_SECONDS,
  )
  if (!allowed) return tooManyRequests(corsHeaders)

  try {
    const { email, installId } = await req.json() as {
      email?: string
      installId?: string
    }

    if (!email || !email.includes("@")) {
      return json({ error: "Valid email is required." }, 400)
    }

    // Reject disposable / throwaway emails immediately
    if (isDisposableEmail(email)) {
      return json(
        { error: "Temporary email addresses are not allowed. Please use your real email.", reason: "email" },
        403,
      )
    }

    // `supabase` (service-role client) is created above for the rate limiter
    // and reused here.
    const normalizedEmail = email.trim().toLowerCase()

    // ── Check if this device has already used a trial ─────────────────────────
    if (installId) {
      const { data: deviceRow } = await supabase
        .from("licenses")
        .select("status, email")
        .eq("install_id", installId)
        .maybeSingle()

      if (deviceRow) {
        // Active subscriber on this device — allow recovery by email below
        if (deviceRow.status !== "active") {
          // Device already used a trial (different or same email)
          return json(
            {
              error: "This browser has already used its free trial. Please subscribe to continue.",
              reason: "device",
            },
            403,
          )
        }
      }
    }

    // ── Check if this email already has a record ──────────────────────────────
    const { data: existing } = await supabase
      .from("licenses")
      .select("license_key, status, trial_ends_at, current_period_ends_at")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (existing) {
      // Active subscriber — return their existing key (recovery after reinstall)
      if (existing.status === "active") {
        return json({
          licenseKey: existing.license_key,
          status: "active",
          message: "recovered",
        })
      }

      // Trial not yet expired — return their existing key
      if (existing.status === "trial") {
        const trialEndsAt = new Date(existing.trial_ends_at)
        if (trialEndsAt > new Date()) {
          return json({
            licenseKey: existing.license_key,
            status: "trial",
            trialEndsAt: existing.trial_ends_at,
            message: "recovered",
          })
        }
      }

      // Trial expired and no active subscription — block second trial
      return json(
        {
          error: "This email has already used its free trial. Please subscribe to continue.",
          reason: "email",
        },
        403,
      )
    }

    // ── New email + new device — create a fresh trial ─────────────────────────
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: created, error: insertError } = await supabase
      .from("licenses")
      .insert({
        email: normalizedEmail,
        status: "trial",
        trial_ends_at: trialEndsAt,
        install_id: installId ?? null,
      })
      .select("license_key")
      .single()

    if (insertError || !created) {
      console.error("Insert error:", insertError)
      return json({ error: "Could not create account. Please try again." }, 500)
    }

    return json({
      licenseKey: created.license_key,
      status: "trial",
      trialEndsAt,
      message: "created",
    })
  } catch (err) {
    console.error("register-license error:", err)
    return json({ error: "Server error. Please try again." }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

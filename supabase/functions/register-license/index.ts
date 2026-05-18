// Edge function: POST /register-license
// Called by the extension during onboarding when the caregiver enters their email.
//
// Logic:
//   - New email → create a 7-day trial record, return the license key
//   - Email exists + active subscription → return current license key (recovery)
//   - Email exists + trial already used up → return error so they can't get a second trial

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { email } = await req.json() as { email?: string }

    if (!email || !email.includes("@")) {
      return json({ error: "Valid email is required." }, 400)
    }

    const supabase = createClient(
      Deno.env.get("SBASE_URL")!,
      Deno.env.get("SBASE_SERVICE_ROLE_KEY")!, // service role bypasses RLS
    )

    const normalizedEmail = email.trim().toLowerCase()

    // Check if this email already has a record
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
        { error: "This email has already used its free trial. Please subscribe to continue." },
        403,
      )
    }

    // New email — create a fresh trial
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: created, error: insertError } = await supabase
      .from("licenses")
      .insert({
        email: normalizedEmail,
        status: "trial",
        trial_ends_at: trialEndsAt,
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

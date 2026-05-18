// Edge function: POST /validate-license
// Called by the extension every 24 hours to check the current license status.
// Returns the status so the extension knows whether to lock or allow access.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { licenseKey } = await req.json() as { licenseKey?: string }

    if (!licenseKey) {
      return json({ error: "licenseKey is required." }, 400)
    }

    const supabase = createClient(
      Deno.env.get("SBASE_URL")!,
      Deno.env.get("SBASE_SERVICE_ROLE_KEY")!,
    )

    const { data: license } = await supabase
      .from("licenses")
      .select("email, status, trial_ends_at, current_period_ends_at, created_at")
      .eq("license_key", licenseKey)
      .maybeSingle()

    if (!license) {
      // Key not found — extension must re-register
      return json({ status: "not_found" }, 404)
    }

    const now = new Date()
    let status = license.status as string

    // Recompute status from timestamps — Lemon Squeezy webhook may have updated
    // current_period_ends_at without touching status, so we derive it fresh here.
    if (status === "trial") {
      const trialEnds = new Date(license.trial_ends_at)
      if (now > trialEnds) {
        status = "expired"
        // Update the record so future webhooks have accurate baseline
        await supabase
          .from("licenses")
          .update({ status: "expired" })
          .eq("license_key", licenseKey)
      }
    }

    if (status === "active" && license.current_period_ends_at) {
      const periodEnds = new Date(license.current_period_ends_at)
      if (now > periodEnds) {
        // Subscription period ended — grace of 3 days before hard-expiry
        const gracePeriodEnds = new Date(periodEnds.getTime() + 3 * 24 * 60 * 60 * 1000)
        if (now < gracePeriodEnds) {
          status = "grace"
        } else {
          status = "expired"
          await supabase
            .from("licenses")
            .update({ status: "expired" })
            .eq("license_key", licenseKey)
        }
      }
    }

    // How many days of trial remain (useful for showing a countdown in settings)
    let daysLeft: number | null = null
    if (status === "trial") {
      const trialEnds = new Date(license.trial_ends_at)
      daysLeft = Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / 86_400_000))
    }

    return json({
      status,
      daysLeft,
      email: license.email,
      trialEndsAt: license.trial_ends_at ?? null,
      currentPeriodEndsAt: license.current_period_ends_at ?? null,
      createdAt: license.created_at,
    })
  } catch (err) {
    console.error("validate-license error:", err)
    return json({ error: "Server error." }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

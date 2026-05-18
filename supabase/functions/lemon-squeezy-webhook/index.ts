// Edge function: POST /lemon-squeezy-webhook
// Lemon Squeezy calls this URL whenever a subscription event happens.
// We verify the signature, then update the license record accordingly.
//
// Events we handle:
//   subscription_created   → status = active
//   subscription_updated   → update period end date
//   subscription_cancelled → keep active until period ends (LS handles this)
//   subscription_expired   → status = expired
//   subscription_resumed   → status = active

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const rawBody = await req.text()

  // Verify the request genuinely came from Lemon Squeezy
  const secret = Deno.env.get("LEMON_SQUEEZY_WEBHOOK_SECRET")
  if (!secret) {
    console.error("LEMON_SQUEEZY_WEBHOOK_SECRET not set")
    return new Response("Server misconfigured", { status: 500 })
  }

  const signature = req.headers.get("x-signature")
  if (!signature || !(await verifySignature(secret, rawBody, signature))) {
    return new Response("Invalid signature", { status: 401 })
  }

  const event = JSON.parse(rawBody) as LemonSqueezyEvent
  const eventName = event.meta?.event_name
  const attributes = event.data?.attributes
  const customData = event.meta?.custom_data as { email?: string } | undefined

  // We pass the caregiver email as custom data when generating the checkout URL
  const email = customData?.email?.trim().toLowerCase()

  if (!email) {
    console.warn("Webhook received with no email in custom_data:", eventName)
    return new Response("ok") // Don't fail — LS will retry
  }

  const supabase = createClient(
    Deno.env.get("SBASE_URL")!,
    Deno.env.get("SBASE_SERVICE_ROLE_KEY")!,
  )

  const subscriptionId = String(event.data?.id ?? "")
  const customerId = String(attributes?.customer_id ?? "")
  const endsAt = attributes?.ends_at ?? attributes?.renews_at ?? null

  if (eventName === "subscription_created" || eventName === "subscription_resumed") {
    await supabase.from("licenses").upsert(
      {
        email,
        status: "active",
        ls_subscription_id: subscriptionId,
        ls_customer_id: customerId,
        current_period_ends_at: endsAt,
      },
      { onConflict: "email" },
    )
  } else if (eventName === "subscription_updated") {
    await supabase
      .from("licenses")
      .update({
        status: "active",
        ls_subscription_id: subscriptionId,
        ls_customer_id: customerId,
        current_period_ends_at: endsAt,
      })
      .eq("email", email)
  } else if (eventName === "subscription_expired") {
    await supabase
      .from("licenses")
      .update({ status: "expired" })
      .eq("email", email)
  }
  // subscription_cancelled: LS keeps it active until period ends — validate-license
  // handles the expiry automatically based on current_period_ends_at

  return new Response("ok", { headers: corsHeaders })
})

async function verifySignature(secret: string, body: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  )
  const sigBytes = hexToBytes(signature)
  const bodyBytes = new TextEncoder().encode(body)
  return crypto.subtle.verify("HMAC", key, sigBytes, bodyBytes)
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return arr
}

interface LemonSqueezyEvent {
  meta?: {
    event_name?: string
    custom_data?: unknown
  }
  data?: {
    id?: string | number
    attributes?: {
      customer_id?: string | number
      ends_at?: string | null
      renews_at?: string | null
      status?: string
    }
  }
}

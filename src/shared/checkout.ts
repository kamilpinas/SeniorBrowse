// Builds Lemon Squeezy checkout links for the subscribe CTAs shown to the
// caregiver (on the expired screen and in the Settings > Trial tab). Both
// callers need the same monthly/yearly URLs, so the construction lives here
// once instead of being duplicated.

export interface CheckoutUrls {
  monthlyUrl: string
  yearlyUrl: string
  /** False when the Lemon Squeezy env vars aren't set (e.g. local dev) — callers use this to hide the subscribe CTA rather than show a broken link. */
  configured: boolean
}

export function getCheckoutUrls(email?: string | null): CheckoutUrls {
  const storeSlug = import.meta.env.VITE_LEMON_SQUEEZY_STORE_ID ?? ""
  const monthlyId = import.meta.env.VITE_LEMON_SQUEEZY_MONTHLY_VARIANT_ID ?? ""
  const yearlyId = import.meta.env.VITE_LEMON_SQUEEZY_YEARLY_VARIANT_ID ?? ""
  const query = email
    ? `?checkout[custom][email]=${encodeURIComponent(email)}`
    : ""

  return {
    monthlyUrl: `https://${storeSlug}.lemonsqueezy.com/buy/${monthlyId}${query}`,
    yearlyUrl: `https://${storeSlug}.lemonsqueezy.com/buy/${yearlyId}${query}`,
    configured: Boolean(storeSlug && monthlyId && yearlyId),
  }
}

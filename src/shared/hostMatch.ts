// Shared hostname-matching logic for the caregiver blacklist and the
// malware domain list — both need "exact host or subdomain of a listed
// host" semantics, e.g. a "evil.com" entry must also catch "sub.evil.com"
// without "notevil.com" matching via naive substring checks.

export function hostMatches(hostname: string, list: Iterable<string>): boolean {
  for (const h of list) {
    if (hostname === h || hostname.endsWith(`.${h}`)) return true
  }
  return false
}

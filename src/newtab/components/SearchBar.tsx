import { type FormEvent, useState } from "react"

const GOOGLE_SEARCH_URL = "https://www.google.com/search"

function handleSubmit(e: FormEvent<HTMLFormElement>) {
  const input = e.currentTarget.elements.namedItem("q") as HTMLInputElement
  if (!input.value.trim()) e.preventDefault()
}

const SearchIcon = () => (
  <svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="22" y2="22" />
  </svg>
)

export function SearchBar() {
  const [focused, setFocused] = useState(false)

  return (
    <section
      aria-label="Search"
      data-tour="search"
      className="sw-fade-up sw-stagger-2"
    >
      <form
        action={GOOGLE_SEARCH_URL}
        method="get"
        target="_self"
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          alignItems: "stretch",
          borderRadius: "var(--radius-pill)",
          overflow: "hidden",
          background: "var(--color-surface-raised)",
          border: `2px solid ${focused ? "var(--color-accent)" : "var(--color-surface-edge)"}`,
          boxShadow: focused
            ? "0 0 0 4px var(--color-accent-light), var(--shadow-md)"
            : "var(--shadow-md)",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        {/* Leading search icon */}
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "center",
            paddingLeft: "1.4rem",
            color: focused ? "var(--color-accent)" : "var(--color-text-subtle)",
            transition: "color 0.2s",
          }}
        >
          <SearchIcon />
        </div>

        <input
          id="search-input"
          name="q"
          type="search"
          autoComplete="off"
          aria-label="Search the web"
          placeholder="Search the web…"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            minHeight: "68px",
            padding: "0 1rem",
            fontSize: "clamp(1.05rem, 1.8vw, 1.25rem)",
            fontWeight: 500,
            fontFamily: "inherit",
            color: "var(--color-text)",
            background: "transparent",
            border: "none",
            outline: "none",
            WebkitAppearance: "none",
          }}
        />

        <button
          type="submit"
          style={{
            margin: "6px",
            padding: "0 1.8rem",
            fontSize: "1.5rem",
            fontWeight: 700,
            fontFamily: "inherit",
            color: "#fff",
            background: "var(--color-accent-strong)",
            border: "none",
            borderRadius: "var(--radius-pill)",
            cursor: "pointer",
            whiteSpace: "nowrap",
            letterSpacing: "0.01em",
            transition: "background 0.18s cubic-bezier(.4,0,.2,1), transform 0.15s cubic-bezier(0.22,1,0.36,1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#6e2808"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-accent-strong)"
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.97)"
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          Search
        </button>
      </form>
    </section>
  )
}

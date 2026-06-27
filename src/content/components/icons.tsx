/** @jsxImportSource preact */

const SZ = 22

const Ico = ({ children }: { children: preact.ComponentChildren }) => (
  <svg
    width={SZ}
    height={SZ}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    {children}
  </svg>
)

export const HomeIcon = () => (
  <Ico>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </Ico>
)
export const BackIcon = () => (
  <Ico>
    <polyline points="15 18 9 12 15 6" />
  </Ico>
)
export const FwdIcon = () => (
  <Ico>
    <polyline points="9 18 15 12 9 6" />
  </Ico>
)
export const TopIcon = () => (
  <Ico>
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </Ico>
)
export const SaveIcon = () => (
  <Ico>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </Ico>
)
export const ExitIcon = () => (
  <Ico>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </Ico>
)
export const ZoomIcon = () => (
  <svg
    width={SZ}
    height={SZ}
    viewBox="0 0 24 24"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <text
      x="1"
      y="16"
      font-size="9"
      font-family="system-ui,sans-serif"
      font-weight="bold"
      fill="currentColor"
    >
      A
    </text>
    <text
      x="11"
      y="20"
      font-size="14"
      font-family="system-ui,sans-serif"
      font-weight="bold"
      fill="currentColor"
    >
      A
    </text>
  </svg>
)
export const EditIcon = () => (
  <Ico>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Ico>
)

export const EyeIcon = () => (
  <Ico>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </Ico>
)

export const EyeSlashIcon = () => (
  <Ico>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </Ico>
)

export const ICONS: Record<string, () => preact.JSX.Element> = {
  home: HomeIcon,
  back: BackIcon,
  forward: FwdIcon,
  scrollTop: TopIcon,
  zoom: ZoomIcon,
  save: SaveIcon,
  exit: ExitIcon,
}

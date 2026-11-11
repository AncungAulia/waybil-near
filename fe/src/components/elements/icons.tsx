/*
 * Glyphs design/waybil.pen draws from lucide, where the Phosphor set the rest of the app
 * uses has no matching shape. The paths are lucide's own, on its 24 viewBox with the 2 px
 * round stroke, so the drawing is the board's and not an approximation of it.
 */

function Glyph({
  size,
  className,
  children,
}: {
  size: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      aria-hidden
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** lucide "wallet", drawn on A1 both as the stamp and inside the connect button. */
export function WalletGlyph({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <Glyph size={size} className={className}>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </Glyph>
  );
}

/** lucide "loader-circle", the waiting stamp on A2 and A5. */
export function LoaderGlyph({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <Glyph size={size} className={`animate-spin motion-reduce:animate-none ${className ?? ""}`}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </Glyph>
  );
}

/** lucide "circle-x", the declined stamp on A3. */
export function CircleXGlyph({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <Glyph size={size} className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </Glyph>
  );
}

/** lucide "arrow-left-right", the wrong-network stamp on A4. */
export function SwapGlyph({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <Glyph size={size} className={className}>
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </Glyph>
  );
}

/** lucide "mail", inside the Google button. */
export function MailGlyph({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <Glyph size={size} className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
    </Glyph>
  );
}

/** The horizontal broken link with a diagonal slash on F4. */
export function LinkOffGlyph({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <Glyph size={size} className={className}>
      <path d="M9 17H7A5 5 0 0 1 7 7" />
      <path d="M15 7h2a5 5 0 0 1 4 8" />
      <path d="M8 12h4" />
      <path d="m2 2 20 20" />
    </Glyph>
  );
}

/** The straight up-right arrow drawn in the design's action buttons. */
export function ArrowUpRightGlyph({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <Glyph size={size} className={className}>
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </Glyph>
  );
}

type SystemGlyphName =
  "compass" | "cloud-off" | "lock" | "wifi-off" | "log-out" | "retry" | "house";

/** The distinct line icons used by the system states on the X board. */
export function SystemGlyph({
  name,
  size = 24,
  className,
}: {
  name: SystemGlyphName;
  size?: number;
  className?: string;
}) {
  const shapes: Record<SystemGlyphName, React.ReactNode> = {
    compass: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z" />
      </>
    ),
    "cloud-off": (
      <>
        <path d="m2 2 20 20" />
        <path d="M22 12a6 6 0 0 0-9.3-5" />
        <path d="M6.3 6.3A7 7 0 0 0 7 20h9.8" />
      </>
    ),
    lock: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
    "wifi-off": (
      <>
        <path d="m2 2 20 20" />
        <path d="M8.5 16.5a5 5 0 0 1 7 0" />
        <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
        <path d="M10.66 5a15 15 0 0 1 11.34 3.76" />
        <path d="M5 12.86a10 10 0 0 1 5.17-2.6" />
        <path d="M16.5 10.92a10 10 0 0 1 2.5 1.93" />
        <path d="M12 20h.01" />
      </>
    ),
    "log-out": (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5M21 12H9" />
      </>
    ),
    retry: (
      <>
        <path d="M3 11a9 9 0 1 1 2.5 6.2" />
        <path d="M3 4v7h7" />
      </>
    ),
    house: (
      <>
        <path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 21v-8h6v8" />
      </>
    ),
  };
  return (
    <Glyph size={size} className={className}>
      {shapes[name]}
    </Glyph>
  );
}

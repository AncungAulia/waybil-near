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

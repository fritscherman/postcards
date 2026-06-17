/**
 * Wanderpost logo — a postcard with a travel route arcing across it.
 * Scales with the `size` prop (pixels). Decorative by default; pass a
 * `title` to expose it to assistive tech.
 */
export function Logo({ size = 48, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <rect width="180" height="180" rx="40" fill="#FFFFFF" stroke="#E7E0D4" strokeWidth="1.5" />
      <g transform="rotate(-7 90 90)">
        <rect x="34" y="52" width="112" height="76" rx="9" fill="#F7F2E8" stroke="#16243B" strokeWidth="3" />
        {/* faint globe on left */}
        <g stroke="#2BB7A3" strokeWidth="1.8" fill="none" opacity="0.9">
          <circle cx="66" cy="90" r="17" />
          <path d="M49,90 H83" />
          <ellipse cx="66" cy="90" rx="7" ry="17" />
          <path d="M51,83 Q66,87 81,83" />
        </g>
        {/* divider + lines (postcard back) */}
        <path d="M96,58 V122" stroke="#16243B" strokeWidth="1.4" />
        <g stroke="#C9C0B0" strokeWidth="2" strokeLinecap="round">
          <path d="M104,74 H138" />
          <path d="M104,86 H138" />
          <path d="M104,98 H132" />
        </g>
        {/* stamp corner */}
        <rect x="120" y="58" width="20" height="14" fill="none" stroke="#FF5A4D" strokeWidth="1.8" strokeDasharray="2 2" />
      </g>
      {/* travel route over card */}
      <path d="M52,128 Q92,96 132,120" fill="none" stroke="#FF5A4D" strokeWidth="2.6" strokeDasharray="2 7" strokeLinecap="round" />
      <circle cx="52" cy="128" r="4.5" fill="#16243B" />
      <path d="M132,120 l-4,-9 8,0 z" fill="#FF5A4D" />
      <circle cx="132" cy="112" r="6.5" fill="#FF5A4D" />
    </svg>
  );
}

export function HoldMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none">
      <path
        d="M10 56V30C10 16.5 19.5 8 32 8s22 8.5 22 22v26"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M22 56V34c0-7 4.4-12 10-12s10 5 10 12v22"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path d="M8 56h48" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M32 42c-3.2-4.4-1.6-9.2 0-12.5 2.4 3.6 4.6 6.6 0 12.5Z"
        fill="currentColor"
      />
      <circle cx="32" cy="41.2" r="2.2" fill="currentColor" />
    </svg>
  );
}

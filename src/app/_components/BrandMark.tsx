/** A compass rose, drawn to match the 1.5px stroke weight of the lucide set. */
export default function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d="M12 2.75v2.4M12 18.85v2.4M2.75 12h2.4M18.85 12h2.4" />
      <path
        d="m15.6 8.4-1.7 5.5-5.5 1.7 1.7-5.5z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

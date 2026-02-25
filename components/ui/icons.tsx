"use client";

import { SVGProps } from "react";

export const SearchIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 5.2 5.2a7.5 7.5 0 0 0 11.45 11.45Z"
    />
  </svg>
);

export const HeartIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.2}
      d="M12 21s-7.5-4.35-9-10a5.25 5.25 0 0 1 9-3.75A5.25 5.25 0 0 1 21 11c-1.5 5.65-9 10-9 10Z"
    />
  </svg>
);

export const FilmIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth={1.5} />
    <path d="M7 3v18M17 3v18M3 8h18M3 16h18" strokeWidth={1.5} />
  </svg>
);

export const StarIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.2}
      d="m12 3 2.26 4.86 5.36.71-3.9 3.77.97 5.3L12 15.89l-4.69 1.75.97-5.3-3.9-3.77 5.36-.71z"
    />
  </svg>
);

export const ClockIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
    <path d="M12 7v5l3 2" strokeWidth={1.5} strokeLinecap="round" />
  </svg>
);

export const ArrowIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path
      d="m5 12 5 5 9-9"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

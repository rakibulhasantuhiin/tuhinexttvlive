import React from "react";

interface LogoProps {
  className?: string;
  glow?: boolean;
  onClick?: () => void;
}

export function TuhinextLogoSVG({ className = "", glow = true, onClick }: LogoProps) {
  return (
    <svg
      onClick={onClick}
      viewBox="0 0 600 200"
      className={`${className} ${glow ? "drop-shadow-[0_0_35px_rgba(255,255,255,0.25)]" : ""}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Rectangular outer framework with a cut-out gap centered at the bottom border */}
      <path
        d="M 240,165 L 50,165 L 50,35 L 550,35 L 550,165 L 360,165"
        fill="none"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* "T V" text drawn with vector paths at the bottom center slot */}
      {/* T inside slot */}
      <path
        d="M 274,152 L 294,152 L 294,157 L 286.5,157 L 286.5,172 L 281.5,172 L 281.5,157 L 274,157 Z"
        fill="currentColor"
      />
      {/* V inside slot */}
      <path
        d="M 306,152 L 311.5,152 L 316,166 L 320.5,152 L 326,152 L 318.5,172 L 313.5,172 Z"
        fill="currentColor"
      />

      {/* Main branded text layout: "TUHI" + lightning bolt + "NEXT" */}
      {/* T */}
      <path
        d="M 85,65 L 127,65 L 127,79 L 113,79 L 113,135 L 99,135 L 99,79 L 85,79 Z"
        fill="currentColor"
      />
      {/* U */}
      <path
        d="M 139,65 L 153,65 L 153,121 L 167,121 L 167,65 L 181,65 L 181,135 L 139,135 Z"
        fill="currentColor"
      />
      {/* H */}
      <path
        d="M 193,65 L 207,65 L 207,92.5 L 221,92.5 L 221,65 L 235,65 L 235,135 L 221,135 L 221,107.5 L 207,107.5 L 207,135 L 193,135 Z"
        fill="currentColor"
      />
      {/* I */}
      <path
        d="M 247,65 L 261,65 L 261,135 L 247,135 Z"
        fill="currentColor"
      />

      {/* Central Lightning Bolt */}
      <path
        d="M 291,55 L 313,55 L 284,95 L 308,95 L 271,145 L 297,103 L 276,103 Z"
        fill="currentColor"
      />

      {/* N */}
      <path
        d="M 325,65 L 340,65 L 355,103 L 355,65 L 369,65 L 369,135 L 354,135 L 339,97 L 339,135 L 325,135 Z"
        fill="currentColor"
      />
      {/* E */}
      <path
        d="M 379,65 L 421,65 L 421,79 L 393,79 L 393,92.5 L 415,92.5 L 415,106.5 L 393,106.5 L 393,121 L 421,121 L 421,135 L 379,135 Z"
        fill="currentColor"
      />
      {/* X */}
      <path
        d="M 433,65 L 447,65 L 455,86 L 463,65 L 477,65 L 463,100 L 477,135 L 463,135 L 455,114 L 447,135 L 433,135 L 447,100 Z"
        fill="currentColor"
      />
      {/* T */}
      <path
        d="M 487,65 L 533,65 L 533,79 L 517.5,79 L 517.5,135 L 502.5,135 L 502.5,79 L 487,79 Z"
        fill="currentColor"
      />
    </svg>
  );
}

"use client";

import React from "react";

// A clean SVG Pill that matches the provided logo format
export const PillLogo = ({ className = "", style = {} }: { className?: string, style?: React.CSSProperties }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    style={style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g transform="rotate(-45 50 50)">
      {/* Top Half (White) */}
      <path
        d="M20 50 v-15 a 30 30 0 0 1 60 0 v15 Z"
        fill="#FFFFFF"
        stroke="#121212"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      {/* Bottom Half (Green) */}
      <path
        d="M20 50 v15 a 30 30 0 0 0 60 0 v-15 Z"
        fill="var(--green)"
        stroke="#121212"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      {/* Shine/Reflection */}
      <path
        d="M32 75 a 12 12 0 0 1 -4 -16"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.6"
      />
    </g>
  </svg>
);

export default function FloatingPills() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => {
        const size = 30 + Math.random() * 40;
        const left = Math.random() * 100;
        const duration = 15 + Math.random() * 20;
        const delay = Math.random() * 10;
        const rotateStart = Math.random() * 360;
        const rotateEnd = rotateStart + (Math.random() > 0.5 ? 360 : -360);
        return (
          <div
            key={i}
            className="absolute"
            style={
              {
                left: `${left}%`,
                top: "-10%",
                width: size,
                height: size,
                opacity: 0.15 + Math.random() * 0.3,
                animation: `floatingPill ${duration}s linear ${delay}s infinite`,
                "--start-rot": `${rotateStart}deg`,
                "--end-rot": `${rotateEnd}deg`,
              } as React.CSSProperties
            }
          >
            <PillLogo style={{ width: "100%", height: "100%" }} />
          </div>
        );
      })}
    </div>
  );
}

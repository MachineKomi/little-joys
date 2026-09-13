import type { CSSProperties } from "react";

type IconName =
  | "toybox"
  | "pause"
  | "play"
  | "muted"
  | "sound"
  | "settings"
  | "close"
  | "check";
export function Icon({
  name,
  className,
  style,
}: {
  name: IconName;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "toybox" && (
        <>
          <path d="M5 12h22v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
          <path d="M3 8h26v5H3zM12 19h8" />
          <path d="M10 8C4 2 15 1 16 8c1-7 12-6 6 0" />
        </>
      )}
      {name === "pause" && (
        <>
          <rect
            x="8"
            y="6"
            width="5"
            height="20"
            rx="1.5"
            fill="currentColor"
            stroke="none"
          />
          <rect
            x="19"
            y="6"
            width="5"
            height="20"
            rx="1.5"
            fill="currentColor"
            stroke="none"
          />
        </>
      )}
      {name === "play" && (
        <path d="M11 6 26 16 11 26Z" fill="currentColor" stroke="none" />
      )}
      {(name === "muted" || name === "sound") && (
        <>
          <path d="M4 12h6l7-6v20l-7-6H4z" />
          {name === "muted" ? (
            <path d="m23 12 6 8m0-8-6 8" />
          ) : (
            <>
              <path d="M22 11c3 3 3 7 0 10M26 7c6 5 6 13 0 18" />
            </>
          )}
        </>
      )}
      {name === "settings" && (
        <>
          <path d="M12 4h8l1 4 4 2 4 6-3 3-1 5-6 4-4-2-5 1-5-6 1-4-1-5 6-4Z" />
          <circle cx="16" cy="16" r="4" />
        </>
      )}
      {name === "close" && <path d="m9 9 14 14m0-14L9 23" />}
      {name === "check" && <path d="m7 16 6 6L26 9" />}
    </svg>
  );
}

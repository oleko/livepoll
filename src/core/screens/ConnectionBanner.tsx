"use client";

/**
 * The "lost connection" banner shown by both the display screen and the
 * participant screen while the realtime channel is reconnecting. The two
 * surfaces intentionally render at different weights (projector vs phone),
 * kept explicit via `variant` rather than collapsed into one look.
 */
export function ConnectionBanner({
  variant,
  message,
}: {
  variant: "prominent" | "compact";
  message: string;
}) {
  if (variant === "prominent") {
    return (
      <div className="absolute top-0 inset-x-0 z-50 bg-amber-500/90 text-amber-950 text-center text-sm font-medium py-2 px-4">
        {message}
      </div>
    );
  }
  return (
    <div className="fixed top-0 inset-x-0 z-40 bg-amber-500 text-amber-950 text-center text-xs font-medium py-1.5 px-4">
      {message}
    </div>
  );
}

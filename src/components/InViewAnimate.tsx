"use client";

import { useEffect, useRef, useState } from "react";

export function InViewAnimate({
  children,
  className = "",
  enterClass,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  enterClass: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // SSR: no class (visible to crawlers). After hydration: opacity-0 until in viewport.
  return (
    <div
      ref={ref}
      className={`${entered ? enterClass : mounted ? "opacity-0" : ""} ${className}`}
      style={entered && delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

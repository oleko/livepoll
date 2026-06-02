"use client";

import { useInView } from "@/hooks/useInView";

export function InViewSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, inView } = useInView(0.1);

  return (
    <section
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ${
        inView
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </section>
  );
}
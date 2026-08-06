"use client";

import { useState } from "react";

export function QrImage({ src, joinUrl, style, className }: {
  src: string; joinUrl: string;
  style?: React.CSSProperties; className?: string;
}) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center ${className ?? ""}`}
        style={style}
      >
        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium px-4">Перейдите по ссылке:</p>
        <p className="text-slate-700 dark:text-slate-200 text-xs font-mono mt-1 px-2 break-all">{joinUrl.replace(/^https?:\/\//, "")}</p>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt="QR-код для участия"
      className={`rounded-2xl block ${className ?? ""}`}
      style={style}
      onError={() => setError(true)}
    />
  );
}

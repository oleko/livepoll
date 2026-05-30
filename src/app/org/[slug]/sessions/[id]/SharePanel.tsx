"use client";

import { useState } from "react";
import { MaxIcon } from "@/components/icons";

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function SharePanel({ joinUrl, joinCode }: { joinUrl: string; joinCode: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const eu = encodeURIComponent(joinUrl);
  const et = encodeURIComponent("Присоединяйтесь к голосованию — без регистрации, прямо со смартфона!");

  const shares = [
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${eu}&text=${et}`,
      bg: "bg-[#229ED9] hover:bg-[#1a8fc4]",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
    },
    {
      label: "VK",
      href: `https://vk.com/share.php?url=${eu}`,
      bg: "bg-[#0077FF] hover:bg-[#0066dd]",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.713-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.565c0 .424-.135.678-1.253.678-1.846 0-3.896-1.12-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.864 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.743c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.762-.491h1.744c.525 0 .643.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.745-.576.745z" />
        </svg>
      ),
    },
    {
      label: "Макс",
      href: `https://max.ru/:share?text=${encodeURIComponent(`Присоединяйтесь к голосованию!\n${joinUrl}`)}`,
      bg: "bg-gradient-to-br from-[#44ccff] to-[#9933dd] hover:opacity-90",
      icon: <MaxIcon size={18} />,
    },
    {
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent("Голосование — присоединяйтесь!")}&body=${encodeURIComponent(`Привет!\n\nПрисоединяйтесь к голосованию по ссылке:\n${joinUrl}\n\nКод: ${joinCode}\n\nНикакой регистрации не нужно — просто откройте ссылку на смартфоне.`)}`,
      bg: "bg-slate-600 hover:bg-slate-500 dark:bg-slate-700 dark:hover:bg-slate-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
    },
  ];

  return (
    <div className="mt-3 flex flex-col gap-2">
      {/* Copyable link */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 max-w-sm">
        <span className="flex-1 text-xs text-slate-600 dark:text-slate-300 font-mono truncate">
          {joinUrl}
        </span>
        <button
          onClick={copyLink}
          className={`shrink-0 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            copied
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              : "bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
          }`}
        >
          {copied ? <IconCheck /> : <IconCopy />}
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>

      {/* Share buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 dark:text-slate-600">Поделиться:</span>
        {shares.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            title={s.label}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors ${s.bg}`}
          >
            {s.icon}
            {s.label}
          </a>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { MaxIcon } from "@/components/icons";

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconExternal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 opacity-40">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function SessionConnectPanel({
  joinUrl,
  joinCode,
  displayUrl,
  presenterUrl,
}: {
  joinUrl: string;
  joinCode: string;
  displayUrl: string;
  presenterUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const eu = encodeURIComponent(joinUrl);
  const et = encodeURIComponent("Присоединяйтесь к голосованию — без регистрации, прямо со смартфона!");
  const emailBody = encodeURIComponent(`Привет!\n\nПрисоединяйтесь к голосованию:\n${joinUrl}\n\nКод: ${joinCode}\n\nРегистрация не нужна.`);

  const shares = [
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${eu}&text=${et}`,
      bg: "bg-[#229ED9]",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
    },
    {
      label: "VK",
      href: `https://vk.com/share.php?url=${eu}`,
      bg: "bg-[#0077FF]",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.713-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.565c0 .424-.135.678-1.253.678-1.846 0-3.896-1.12-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.864 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.743c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.762-.491h1.744c.525 0 .643.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.745-.576.745z" />
        </svg>
      ),
    },
    {
      label: "Макс",
      href: `https://max.ru/:share?text=${encodeURIComponent(`Присоединяйтесь к голосованию!\n${joinUrl}`)}`,
      bg: "bg-gradient-to-br from-[#44ccff] to-[#9933dd]",
      icon: <MaxIcon size={14} />,
    },
    {
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent("Голосование — присоединяйтесь!")}&body=${emailBody}`,
      bg: "bg-slate-500 dark:bg-slate-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
    },
  ];

  const screens = [
    {
      href: displayUrl,
      icon: "🖥",
      label: "Проектор",
      desc: "Для аудитории",
      accent: "group-hover:border-purple-300 dark:group-hover:border-purple-700 group-hover:bg-purple-50/60 dark:group-hover:bg-purple-900/20",
      labelColor: "group-hover:text-purple-700 dark:group-hover:text-purple-300",
    },
    {
      href: presenterUrl,
      icon: "🎤",
      label: "Ведущий",
      desc: "Для ноутбука",
      accent: "group-hover:border-indigo-300 dark:group-hover:border-indigo-700 group-hover:bg-indigo-50/60 dark:group-hover:bg-indigo-900/20",
      labelColor: "group-hover:text-indigo-700 dark:group-hover:text-indigo-300",
    },
    {
      href: joinUrl,
      icon: "📱",
      label: "Участник",
      desc: "Предпросмотр",
      accent: "group-hover:border-emerald-300 dark:group-hover:border-emerald-700 group-hover:bg-emerald-50/60 dark:group-hover:bg-emerald-900/20",
      labelColor: "group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">

        {/* ── Participants ── */}
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-600">
            Участники
          </p>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">Код</span>
            <span className="font-mono text-[2rem] leading-none font-black text-slate-900 dark:text-white tracking-[0.15em]">
              {joinCode}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
            <span className="flex-1 min-w-0 text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
              {joinUrl.replace(/^https?:\/\//, "")}
            </span>
            <button
              onClick={copyLink}
              className={`shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                copied
                  ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                  : "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300"
              }`}
            >
              {copied ? <IconCheck /> : <IconCopy />}
              {copied ? "Скопировано" : "Копировать"}
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-slate-400 dark:text-slate-600">Поделиться</span>
            <div className="flex items-center gap-1.5">
              {shares.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label}
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-white transition-all hover:scale-110 hover:opacity-90 ${s.bg}`}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Screens ── */}
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-600">
            Экраны
          </p>

          <div className="grid grid-cols-3 gap-2">
            {screens.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                target="_blank"
                className={`group flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-2 py-3.5 text-center transition-all duration-150 ${s.accent}`}
              >
                <span className="text-xl">{s.icon}</span>
                <div className="flex items-center gap-1">
                  <span className={`text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors ${s.labelColor}`}>
                    {s.label}
                  </span>
                  <IconExternal />
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-600 leading-tight">
                  {s.desc}
                </span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

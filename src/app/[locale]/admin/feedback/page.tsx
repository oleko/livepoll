import { getFeedback } from "@/lib/actions/feedback";
import { getTranslations, getLocale } from "next-intl/server";

export const metadata = { title: "Feedback — Admin" };

export default async function FeedbackPage() {
  const t = await getTranslations("Admin.feedback");
  const locale = await getLocale();
  const dateLocale = locale === "ru" ? "ru-RU" : "en-US";

  const TYPE_CONFIG = {
    bug:      { label: t("typeBug"),      icon: "🐛", color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-400/10 border-red-200 dark:border-red-400/20" },
    idea:     { label: t("typeIdea"),     icon: "💡", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 border-amber-200 dark:border-amber-400/20" },
    question: { label: t("typeQuestion"), icon: "❓", color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-400/10 border-indigo-200 dark:border-indigo-400/20" },
  };

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(dateLocale, {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  function formatPage(url: string | null) {
    if (!url) return null;
    try {
      const u = new URL(url);
      return u.pathname + (u.search || "");
    } catch {
      return url;
    }
  }

  const rows = await getFeedback();

  const counts = {
    bug:      rows.filter((r) => r.type === "bug").length,
    idea:     rows.filter((r) => r.type === "idea").length,
    question: rows.filter((r) => r.type === "question").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t("total", { count: rows.length })}
          </p>
        </div>
        <div className="flex gap-2">
          {Object.entries(counts).map(([type, count]) => {
            const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
            return (
              <span
                key={type}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${cfg.color}`}
              >
                {cfg.icon} {cfg.label} · {count}
              </span>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-16 text-center">
          <p className="text-slate-400 dark:text-slate-500">{t("empty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const cfg = TYPE_CONFIG[row.type];
            const page = formatPage(row.page_url);
            return (
              <div
                key={row.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4"
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium mt-0.5 ${cfg.color}`}
                  >
                    {cfg.icon} {cfg.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {row.text}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                      {row.user_email && (
                        <a
                          href={`mailto:${row.user_email}`}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {row.user_email}
                        </a>
                      )}
                      {page && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate max-w-xs" title={row.page_url ?? ""}>
                          {page}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto shrink-0">
                        {formatDate(row.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { NAV_ITEMS, slugToNavKey } from "./nav-items";

export const metadata = { title: "Help Center | Kvoroom" };

export default async function HelpIndexPage() {
  const t = await getTranslations("Help");

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t("index.title")}</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">
        {t("index.subtitle")}
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        {NAV_ITEMS.map((item) => {
          const key = slugToNavKey(item.slug);
          return (
            <Link
              key={item.slug}
              href={`/help/${item.slug}`}
              className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-white dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="text-2xl mb-3">{item.icon}</div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {t(`nav.${key}` as Parameters<typeof t>[0])}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t(`index.desc.${key}` as Parameters<typeof t>[0])}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="mt-12 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{t("index.contactTitle")}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("index.contactText", { email: "oleko85@gmail.com" }).split("oleko85@gmail.com")[0]}
          <a href="mailto:oleko85@gmail.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            oleko85@gmail.com
          </a>
          {t("index.contactText", { email: "oleko85@gmail.com" }).split("oleko85@gmail.com")[1]}
        </p>
      </div>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { PollResults } from "./PollList";
import type { SlideRow, SlideType } from "@/lib/actions/slides";
import type { Poll, PollType } from "@/types/database";

type PollRow = Pick<Poll, "id" | "title" | "type" | "status" | "sort_order"> & {
  options: unknown[];
  created_at: string;
  section_id: string | null;
  settings?: Record<string, unknown> | null;
};

/**
 * What the room is looking at right now, shown without the host having to ask.
 *
 * The right-hand column used to render a permanent "Здесь пусто" telling the
 * host to pick something from the lineup to see results. That reads fine on a
 * screenshot and fails in the one situation that matters: during a live event
 * the host glances at this screen between remarks and needs the running poll's
 * tally immediately, not after a click. So the active item selects itself, and
 * the empty state is kept for what it actually describes — nothing running.
 */
export function ActiveItemPanel({
  polls,
  slides,
  activeSlideId,
  votesByPoll,
  votesDataByPoll,
  totalVotes,
}: {
  polls: PollRow[];
  slides: SlideRow[];
  activeSlideId: string | null;
  votesByPoll: Record<string, number>;
  votesDataByPoll: Record<string, Record<string, number>>;
  totalVotes: number;
}) {
  const t = useTranslations("Org.session.layout");
  const tShared = useTranslations("Org.shared");

  const activePoll = polls.find((p) => p.status === "active") ?? null;
  const activeSlide = activeSlideId ? slides.find((s) => s.id === activeSlideId) ?? null : null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col gap-3 items-start h-fit">
      {activePoll ? (
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-400/10 px-2.5 py-1 text-xs font-bold text-green-700 dark:text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400" aria-hidden="true" />
            {t("onScreenNow")}
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{activePoll.title}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {tShared(`pollTypeLabel.${activePoll.type as PollType}`)}
            </p>
          </div>
          <div className="w-full">
            <PollResults
              poll={activePoll}
              valueCounts={votesDataByPoll[activePoll.id] ?? {}}
              total={votesByPoll[activePoll.id] ?? 0}
            />
          </div>
        </>
      ) : activeSlide ? (
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-400/10 px-2.5 py-1 text-xs font-bold text-green-700 dark:text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400" aria-hidden="true" />
            {t("onScreenNow")}
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
              {slideTitle(activeSlide)}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {tShared(`slideTypeLabel.${activeSlide.type as SlideType}`)}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
            <div className="w-3.5 h-3.5 rounded border-2 border-indigo-400 dark:border-indigo-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{t("emptyTitle")}</p>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t("emptyDesc")}</p>
          </div>
        </>
      )}

      {/* slate-400 on white is 2.6:1 and slate-600 on slate-900 is 2.4:1 — both
          fail AA, and this line carries real information. */}
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
        {t("totalVotes", { count: totalVotes })}
      </p>
    </div>
  );
}

/** Slides keep their label in `content` under a different key per type. */
function slideTitle(slide: SlideRow): string {
  const c = slide.content as { title?: string; name?: string; text?: string; question?: string };
  return c.title || c.name || c.question || c.text?.slice(0, 60) || "—";
}

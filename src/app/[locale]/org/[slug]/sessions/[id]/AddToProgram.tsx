"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { NewPollForm } from "./NewPollForm";
import { AddSlidePanel } from "./AddSlidePanel";
import { QuizQuestionForm } from "@/modules/modes/quiz/QuestionForm";
import { PollTypeIcon, SlideTypeIcon } from "@/core/screens/TypeIcon";
import { pollTypesInOrder } from "@/core/registry/polls";
import { slideTypesInOrder } from "@/core/registry/slides";
import { modeModule } from "@/core/registry/modes";
import { Trophy } from "@phosphor-icons/react";
import type { PollType } from "@/types/database";
import type { SlideType } from "@/core/domain/slide";

type SectionItem = { id: string; title: string };

type Choice =
  | { kind: "poll"; type: PollType }
  | { kind: "slide"; type: SlideType }
  | { kind: "quizQuestion" };

/**
 * One picker for everything that can go into the programme.
 *
 * It replaces a three-tab switcher (Опрос / Экран / Квиз) whose boundaries
 * were technical rather than meaningful: for the host all three answer the
 * same question — "what do I put in front of the room next". The split also
 * leaked implementation detail, with the `reveal` screen (a question with an
 * answer and a buzzer) filed under Screens because that is where its code
 * lives, not because anyone would look for it there.
 *
 * The other half of the old quiz tab was championship configuration — a
 * session-wide setting, not an item — and it moved to the session's Settings
 * tab where the rest of the configuration lives.
 *
 * Quiz mode still narrows what is on offer, but now it shows as a shorter list
 * instead of a tab disappearing with no explanation.
 */
export function AddToProgram({
  sessionId,
  orgSlug,
  sections,
  championship,
}: {
  sessionId: string;
  orgSlug: string;
  sections: SectionItem[];
  championship?: { enabled: boolean };
}) {
  const t = useTranslations("Org.session.addToProgram");
  const tShared = useTranslations("Org.shared");
  const [choice, setChoice] = useState<Choice | null>(null);

  const isQuiz = championship?.enabled === true;
  const allowedSlides = modeModule(isQuiz ? "quiz" : "conference").capabilities.slideTypes;
  const slideTypes = allowedSlides === "all" ? slideTypesInOrder : slideTypesInOrder.filter((s) => allowedSlides.includes(s));

  if (choice) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setChoice(null)}
          className="self-start text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          ← {t("backToTypes")}
        </button>
        <p className="text-sm font-bold text-slate-900 dark:text-white">
          {choice.kind === "poll"
            ? tShared(`pollTypeLabel.${choice.type}`)
            : choice.kind === "slide"
              ? tShared(`slideTypeLabel.${choice.type}`)
              : t("quizQuestion")}
        </p>
        {choice.kind === "poll" && (
          <NewPollForm sessionId={sessionId} orgSlug={orgSlug} sections={sections} lockedType={choice.type} />
        )}
        {choice.kind === "slide" && (
          <AddSlidePanel sessionId={sessionId} orgSlug={orgSlug} bare lockedType={choice.type} />
        )}
        {choice.kind === "quizQuestion" && <QuizQuestionForm sessionId={sessionId} orgSlug={orgSlug} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Раньше в режиме викторины вкладка «Опрос» просто исчезала, и ведущий
          видел только пропажу. Сужение осталось, но теперь оно объяснено. */}
      {isQuiz && (
        <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
          {t("quizModeNote")}
        </p>
      )}
      {isQuiz ? (
        <Group title={t("groupQuizQuestion")}>
          <Card onClick={() => setChoice({ kind: "quizQuestion" })}>
            <Trophy size={17} weight="bold" className="shrink-0 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
            {t("quizQuestion")}
          </Card>
        </Group>
      ) : (
        <Group title={t("groupAsk")}>
          {pollTypesInOrder.map((pt) => (
            <Card key={pt} onClick={() => setChoice({ kind: "poll", type: pt })}>
              <PollTypeIcon type={pt} size={17} weight="bold" className="shrink-0 text-indigo-500 dark:text-indigo-400" />
              <span className="flex flex-col gap-0.5">
                {tShared(`pollTypeLabel.${pt}`)}
                {/* qa и idea_wall пишут не в голоса, а в вопросы — и ответы
                    на них ведущий потом ищет во вкладке Q&A, а не в карточке
                    опроса. Это стоит сказать до создания, а не после. */}
                {(pt === "qa" || pt === "idea_wall") && (
                  <span className="font-normal text-[10px] text-slate-400 dark:text-slate-500">{t("goesToQaTab")}</span>
                )}
              </span>
            </Card>
          ))}
        </Group>
      )}

      <Group title={t("groupShow")}>
        {slideTypes.map((st) => (
          <Card key={st} onClick={() => setChoice({ kind: "slide", type: st })}>
            <SlideTypeIcon type={st} size={17} weight="bold" className="shrink-0 text-purple-500 dark:text-purple-400" />
            {tShared(`slideTypeLabel.${st}`)}
          </Card>
        ))}
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</span>
      <div className="grid grid-cols-2 gap-1.5">{children}</div>
    </div>
  );
}

function Card({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left text-xs font-semibold leading-tight text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-slate-900 dark:hover:text-white transition-colors"
    >
      {children}
    </button>
  );
}

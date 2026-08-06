"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { NewPollForm } from "./NewPollForm";
import { AddSlidePanel } from "./AddSlidePanel";
import { QuizHostPanel } from "@/modules/modes/quiz/HostPanel";
import { modeModule } from "@/core/registry/modes";

type SectionItem = { id: string; title: string };
type QuizPoll = { id: string; title: string; settings?: Record<string, unknown> | null };

export function CreationTabs({
  sessionId,
  orgSlug,
  sections,
  quizPolls = [],
  championship,
  sessionStatus,
}: {
  sessionId: string;
  orgSlug: string;
  sections: SectionItem[];
  quizPolls?: QuizPoll[];
  championship?: { enabled: boolean; auto: boolean; reveal_duration: number };
  sessionStatus?: "draft" | "active" | "ended";
}) {
  const t = useTranslations("Org.session.creationTabs");
  // Quiz mode authoring surface is deliberately narrow: the "quiz" tab's
  // QuizQuestionForm already creates exactly what championship needs
  // (multiple_choice + quiz_mode), so the generic "poll" tab — which can
  // create any of the 8 types, most of which don't fit a lobby → round →
  // leaderboard flow — is hidden rather than taught to filter itself.
  const isQuiz = championship?.enabled === true;
  const slideTypes = modeModule(isQuiz ? "quiz" : "conference").capabilities.slideTypes;
  const allowedSlideTypes = slideTypes === "all" ? undefined : slideTypes;

  return (
    <Tabs defaultValue={isQuiz ? "slide" : "poll"}>
      <TabsList className="mb-5">
        {!isQuiz && <TabsTrigger value="poll">{t("pollTab")}</TabsTrigger>}
        <TabsTrigger value="slide">{t("slideTab")}</TabsTrigger>
        <TabsTrigger value="quiz">{t("quizTab")}</TabsTrigger>
      </TabsList>

      {!isQuiz && (
        <TabsContent value="poll">
          <NewPollForm sessionId={sessionId} orgSlug={orgSlug} sections={sections} />
        </TabsContent>
      )}
      <TabsContent value="slide">
        <AddSlidePanel sessionId={sessionId} orgSlug={orgSlug} bare allowedTypes={allowedSlideTypes} />
      </TabsContent>
      <TabsContent value="quiz">
        <QuizHostPanel
          sessionId={sessionId}
          orgSlug={orgSlug}
          quizPolls={quizPolls}
          initial={championship ?? { enabled: false, auto: true, reveal_duration: 10 }}
          sessionStatus={sessionStatus ?? "draft"}
        />
      </TabsContent>
    </Tabs>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { NewPollForm } from "./NewPollForm";
import { AddSlidePanel } from "./AddSlidePanel";
import { QuizTab } from "./QuizTab";

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

  return (
    <Tabs defaultValue="poll">
      <TabsList className="mb-5">
        <TabsTrigger value="poll">{t("pollTab")}</TabsTrigger>
        <TabsTrigger value="slide">{t("slideTab")}</TabsTrigger>
        <TabsTrigger value="quiz">{t("quizTab")}</TabsTrigger>
      </TabsList>

      <TabsContent value="poll">
        <NewPollForm sessionId={sessionId} orgSlug={orgSlug} sections={sections} />
      </TabsContent>
      <TabsContent value="slide">
        <AddSlidePanel sessionId={sessionId} orgSlug={orgSlug} bare />
      </TabsContent>
      <TabsContent value="quiz">
        <QuizTab
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

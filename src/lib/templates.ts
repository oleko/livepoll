import type { PollType } from "@/types/database";

export interface PollTemplate {
  title: string;
  type: PollType;
  options: string[];
}

export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  polls: PollTemplate[];
}

export const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    id: "retro",
    name: "Ретро спринта",
    description: "Что прошло хорошо, что улучшить, оценка задач",
    icon: "🔄",
    polls: [
      {
        title: "Что прошло хорошо в этом спринте?",
        type: "like_dislike",
        options: [],
      },
      {
        title: "Что нужно улучшить?",
        type: "word_cloud",
        options: [],
      },
      {
        title: "Идеи на следующий спринт",
        type: "word_cloud",
        options: [],
      },
      {
        title: "Оцените следующую задачу",
        type: "planning_poker",
        options: [],
      },
    ],
  },
  {
    id: "conference",
    name: "Конференция / митап",
    description: "Настроение зала, выбор темы, вопросы к докладчику",
    icon: "🎤",
    polls: [
      {
        title: "Как ваше настроение?",
        type: "temperature",
        options: [],
      },
      {
        title: "Какую тему разобрать подробнее?",
        type: "multiple_choice",
        options: ["Архитектура", "Процессы", "Инструменты", "Другое"],
      },
      {
        title: "Вопросы к докладчику",
        type: "qa",
        options: [],
      },
    ],
  },
  {
    id: "training",
    name: "Тренинг / лекция",
    description: "Уровень аудитории, проверка знаний, оценка материала",
    icon: "🎓",
    polls: [
      {
        title: "Насколько вы знакомы с темой?",
        type: "temperature",
        options: [],
      },
      {
        title: "Что было самым полезным?",
        type: "word_cloud",
        options: [],
      },
      {
        title: "Оцените качество материала",
        type: "temperature",
        options: [],
      },
      {
        title: "Вопросы",
        type: "qa",
        options: [],
      },
    ],
  },
  {
    id: "team-meeting",
    name: "Командная встреча",
    description: "Голосование по решениям, приоритеты, реакция команды",
    icon: "👥",
    polls: [
      {
        title: "Все готовы начать?",
        type: "like_dislike",
        options: [],
      },
      {
        title: "Ваши приоритеты на встречу",
        type: "word_cloud",
        options: [],
      },
      {
        title: "Принимаем решение?",
        type: "like_dislike",
        options: [],
      },
    ],
  },
];

export function getTemplate(id: string): SessionTemplate | undefined {
  return SESSION_TEMPLATES.find((t) => t.id === id);
}

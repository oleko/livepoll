import type { PollType } from "@/types/database";

export interface PollTemplate {
  title: string;
  type: PollType;
  options: string[];
  quiz_mode?: boolean;
  correct_option?: string;
}

export interface PollTemplateCategory {
  id: string;
  name: string;
  icon: string;
  templates: PollTemplate[];
}

export const POLL_TEMPLATE_CATEGORIES: PollTemplateCategory[] = [
  {
    id: "icebreaker",
    name: "Icebreakers",
    icon: "🌡️",
    templates: [
      {
        title: "Как ваше настроение прямо сейчас?",
        type: "temperature",
        options: [],
      },
      {
        title: "Насколько вы готовы к этой теме?",
        type: "temperature",
        options: [],
      },
      {
        title: "Ваше слово дня",
        type: "word_cloud",
        options: [],
      },
      {
        title: "Выразите ваше ожидание от сессии",
        type: "emoji_cloud",
        options: [],
      },
      {
        title: "Одним словом: как прошла неделя?",
        type: "word_cloud",
        options: [],
      },
    ],
  },
  {
    id: "conference",
    name: "Конференция",
    icon: "🎤",
    templates: [
      {
        title: "Какую тему разобрать подробнее?",
        type: "multiple_choice",
        options: ["Архитектура", "Процессы", "Инструменты", "Безопасность", "Другое"],
      },
      {
        title: "Насколько полезен был доклад?",
        type: "temperature",
        options: [],
      },
      {
        title: "Что зацепило в докладе больше всего?",
        type: "word_cloud",
        options: [],
      },
      {
        title: "Вы уже используете эту технологию?",
        type: "like_dislike",
        options: [],
      },
      {
        title: "Вопросы к докладчику",
        type: "qa",
        options: [],
      },
      {
        title: "Формат следующей сессии?",
        type: "multiple_choice",
        options: ["Доклад", "Воркшоп", "Дискуссия", "Панельная дискуссия"],
      },
    ],
  },
  {
    id: "agile",
    name: "Agile / Scrum",
    icon: "🔄",
    templates: [
      {
        title: "Оцените следующую задачу",
        type: "planning_poker",
        options: [],
      },
      {
        title: "Команда готова к спринту?",
        type: "like_dislike",
        options: [],
      },
      {
        title: "Что мешает работе больше всего?",
        type: "word_cloud",
        options: [],
      },
      {
        title: "Темп спринта был комфортным?",
        type: "temperature",
        options: [],
      },
      {
        title: "Принимаем решение по этому вопросу?",
        type: "like_dislike",
        options: [],
      },
      {
        title: "Что нужно улучшить в следующем спринте?",
        type: "word_cloud",
        options: [],
      },
    ],
  },
  {
    id: "training",
    name: "Обучение",
    icon: "🎓",
    templates: [
      {
        title: "Что такое SOLID?",
        type: "multiple_choice",
        options: [
          "Принципы ООП",
          "Паттерн проектирования",
          "База данных",
          "Протокол передачи данных",
        ],
        quiz_mode: true,
        correct_option: "Принципы ООП",
      },
      {
        title: "Что делает оператор spread (...) в JavaScript?",
        type: "multiple_choice",
        options: [
          "Разворачивает итерируемый объект в элементы",
          "Удаляет дубликаты из массива",
          "Создаёт глубокую копию объекта",
          "Останавливает выполнение функции",
        ],
        quiz_mode: true,
        correct_option: "Разворачивает итерируемый объект в элементы",
      },
      {
        title: "Насколько понятен материал?",
        type: "temperature",
        options: [],
      },
      {
        title: "Что было самым полезным?",
        type: "word_cloud",
        options: [],
      },
      {
        title: "Оцените качество обучения",
        type: "temperature",
        options: [],
      },
      {
        title: "Вопросы по материалу",
        type: "qa",
        options: [],
      },
    ],
  },
  {
    id: "hr",
    name: "HR / Команда",
    icon: "👥",
    templates: [
      {
        title: "Оцените уровень вовлечённости в команде",
        type: "temperature",
        options: [],
      },
      {
        title: "Что важнее всего в командной работе?",
        type: "multiple_choice",
        options: ["Доверие", "Чёткие процессы", "Общие цели", "Открытая коммуникация"],
      },
      {
        title: "Удовлетворены ли вы балансом работы и жизни?",
        type: "temperature",
        options: [],
      },
      {
        title: "Ключевые слова нашей культуры",
        type: "word_cloud",
        options: [],
      },
      {
        title: "Хотели бы вы больше удалённой работы?",
        type: "like_dislike",
        options: [],
      },
    ],
  },
];
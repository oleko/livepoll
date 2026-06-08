"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: "Множественный выбор",
  temperature:     "Шкала температуры",
  qa:              "Q&A",
  like_dislike:    "Лайк / Дизлайк",
  word_cloud:      "Облако слов",
  emoji_cloud:     "Облако эмодзи",
  planning_poker:  "Planning Poker",
  idea_wall:       "Стена идей",
};

type PollExport = {
  id: string;
  title: string;
  type: string;
  options: string[];
  section_id: string | null;
};

type SectionExport = {
  id: string;
  title: string;
  sort_order: number;
};

type QuestionExport = {
  text: string;
  status: string;
};

type Props = {
  session: { title: string; join_code: string };
  polls: PollExport[];
  sections: SectionExport[];
  votesByPoll: Record<string, number>;
  votesDataByPoll: Record<string, Record<string, number>>;
  questions: QuestionExport[];
};

function csvEscape(s: string) {
  return `"${s.replace(/"/g, '""')}"`;
}

function buildOptions(poll: PollExport, counts: Record<string, number>) {
  if (poll.type === "multiple_choice" && poll.options.length > 0) return poll.options;
  return Object.keys(counts).sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
}

export function ExportButton({ session, polls, sections, votesByPoll, votesDataByPoll, questions }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function writePollCSV(rows: string[], poll: PollExport, idx: number) {
    const total = votesByPoll[poll.id] ?? 0;
    const counts = votesDataByPoll[poll.id] ?? {};
    rows.push(`${csvEscape(`Опрос ${idx}`)},${csvEscape(poll.title)}`);
    rows.push(`${csvEscape("Тип")},${csvEscape(TYPE_LABEL[poll.type] ?? poll.type)}`);
    if (poll.type === "qa") {
      rows.push(`${csvEscape("Вопросов")},${total}`);
    } else if (poll.type === "temperature") {
      if (total > 0) {
        const sum = Object.entries(counts).reduce((s, [v, c]) => s + parseFloat(v) * c, 0);
        rows.push(`${csvEscape("Среднее")},${csvEscape((sum / total).toFixed(1))}`);
      }
      rows.push(`${csvEscape("Всего голосов")},${total}`);
    } else {
      rows.push(`${csvEscape("Вариант")},${csvEscape("Голосов")},${csvEscape("Процент")}`);
      buildOptions(poll, counts).forEach((o) => {
        const c = counts[o] ?? 0;
        const pct = total ? Math.round((c / total) * 100) : 0;
        rows.push(`${csvEscape(o)},${c},${csvEscape(`${pct}%`)}`);
      });
      rows.push(`${csvEscape("Всего")},${total},`);
    }
    rows.push("");
  }

  function exportCSV() {
    setOpen(false);
    const date = new Date().toLocaleDateString("ru-RU");
    const rows: string[] = [
      `${csvEscape("Мероприятие")},${csvEscape(session.title)}`,
      `${csvEscape("Код")},${csvEscape(session.join_code)}`,
      `${csvEscape("Дата экспорта")},${csvEscape(date)}`,
      "",
    ];

    let idx = 1;
    if (sections.length > 0) {
      const sorted = [...sections].sort((a, b) => a.sort_order - b.sort_order);
      sorted.forEach((section) => {
        const sectionPolls = polls.filter((p) => p.section_id === section.id);
        if (sectionPolls.length === 0) return;
        rows.push(`${csvEscape("Секция")},${csvEscape(section.title)}`);
        rows.push("");
        sectionPolls.forEach((poll) => { writePollCSV(rows, poll, idx++); });
      });
      const unsectioned = polls.filter((p) => p.section_id === null);
      if (unsectioned.length > 0) {
        rows.push(`${csvEscape("Секция")},${csvEscape("Без секции")}`);
        rows.push("");
        unsectioned.forEach((poll) => { writePollCSV(rows, poll, idx++); });
      }
    } else {
      polls.forEach((poll) => { writePollCSV(rows, poll, idx++); });
    }

    if (questions.length > 0) {
      rows.push(`${csvEscape("Q&A вопросы")}`);
      rows.push(`${csvEscape("Текст")},${csvEscape("Статус")}`);
      const STATUS: Record<string, string> = { answered: "Отвечен", hidden: "Скрыт", pending: "Ожидает" };
      questions.forEach((q) => {
        rows.push(`${csvEscape(q.text)},${csvEscape(STATUS[q.status] ?? q.status)}`);
      });
    }

    const blob = new Blob(["﻿" + rows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title}_${session.join_code}.csv`.replace(/[\\/:*?"<>|]/g, "_");
    a.click();
    URL.revokeObjectURL(url);
  }

  function buildPollHtml(poll: PollExport, idx: number, total_polls: number) {
    const total = votesByPoll[poll.id] ?? 0;
    const counts = votesDataByPoll[poll.id] ?? {};
    let body = "";
    if (poll.type === "qa") {
      body = `<p class="note">Вопросов получено: ${total}</p>`;
    } else if (poll.type === "temperature") {
      if (total > 0) {
        const sum = Object.entries(counts).reduce((s, [v, c]) => s + parseFloat(v) * c, 0);
        const avg = (sum / total).toFixed(1);
        const pct = Math.round((parseFloat(avg) / 5) * 100);
        body = `<div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div>
          <p class="note">Среднее: ${avg} / 5 · ${total} голосов</p>`;
      } else {
        body = `<p class="note">Голосов нет</p>`;
      }
    } else if (poll.type === "like_dislike") {
      const likes = counts["like"] ?? 0;
      const dislikes = counts["dislike"] ?? 0;
      const lp = total ? Math.round((likes / total) * 100) : 0;
      const dp = total ? Math.round((dislikes / total) * 100) : 0;
      body = `<table><thead><tr><th>Реакция</th><th>Голосов</th><th>%</th></tr></thead>
        <tbody>
          <tr><td>👍</td><td>${likes}</td><td>${lp}%</td></tr>
          <tr><td>👎</td><td>${dislikes}</td><td>${dp}%</td></tr>
        </tbody></table>
        <p class="note">Всего голосов: ${total}</p>`;
    } else {
      const options = buildOptions(poll, counts);
      const max = Math.max(...options.map((o) => counts[o] ?? 0), 1);
      const trows = options.map((o) => {
        const c = counts[o] ?? 0;
        const pct = total ? Math.round((c / total) * 100) : 0;
        const barPct = Math.round((c / max) * 100);
        return `<tr>
          <td class="opt">${o}</td>
          <td class="bar-cell"><div class="bar-wrap"><div class="bar" style="width:${barPct}%"></div></div></td>
          <td class="num">${c}</td>
          <td class="num">${pct}%</td>
        </tr>`;
      }).join("");
      body = `<table class="results"><thead><tr><th>Вариант</th><th></th><th>Голосов</th><th>%</th></tr></thead>
        <tbody>${trows}</tbody></table>
        <p class="note">Всего голосов: ${total}</p>`;
    }
    return `<div class="poll">
      <p class="poll-num">${idx} / ${total_polls}</p>
      <h3>${poll.title}</h3>
      <p class="type">${TYPE_LABEL[poll.type] ?? poll.type}</p>
      ${body}
    </div>`;
  }

  function exportPDF() {
    setOpen(false);
    const date = new Date().toLocaleDateString("ru-RU");

    let pollsHtml = "";
    let idx = 1;
    if (sections.length > 0) {
      const sorted = [...sections].sort((a, b) => a.sort_order - b.sort_order);
      sorted.forEach((section) => {
        const sectionPolls = polls.filter((p) => p.section_id === section.id);
        if (sectionPolls.length === 0) return;
        pollsHtml += `<div class="section-header">${section.title}</div>`;
        sectionPolls.forEach((poll) => { pollsHtml += buildPollHtml(poll, idx++, polls.length); });
      });
      const unsectioned = polls.filter((p) => p.section_id === null);
      if (unsectioned.length > 0) {
        pollsHtml += `<div class="section-header">Без секции</div>`;
        unsectioned.forEach((poll) => { pollsHtml += buildPollHtml(poll, idx++, polls.length); });
      }
    } else {
      polls.forEach((poll) => { pollsHtml += buildPollHtml(poll, idx++, polls.length); });
    }

    const questionsHtml = questions.length > 0 ? `
      <div class="section">
        <h2>Q&A вопросы</h2>
        ${questions.map((q) => {
          const mark = q.status === "answered" ? '<span class="answered">✓</span>' : "";
          return `<div class="question">${mark}<span>${q.text}</span></div>`;
        }).join("")}
      </div>` : "";

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${session.title} — результаты</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b;padding:36px 48px;font-size:13px;line-height:1.5}
h1{font-size:20px;font-weight:700;margin-bottom:2px}
.meta{color:#64748b;font-size:12px;margin-bottom:28px}
h2{font-size:14px;font-weight:600;margin-bottom:14px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}
.section{margin-bottom:28px}
.section-header{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;padding:10px 0 6px;border-bottom:2px solid #e2e8f0;margin-bottom:10px;margin-top:8px}
.poll{margin-bottom:20px;padding:14px 16px;border:1px solid #e2e8f0;border-radius:8px;break-inside:avoid}
.poll-num{font-size:11px;color:#94a3b8;margin-bottom:2px}
.poll h3{font-size:14px;font-weight:600;margin-bottom:2px}
.poll .type{color:#64748b;font-size:11px;margin-bottom:10px}
.poll .note{color:#64748b;font-size:12px;margin-top:6px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px}
th{text-align:left;padding:5px 8px;background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
td{padding:5px 8px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
td.opt{max-width:200px;word-break:break-word}
td.num{text-align:right;white-space:nowrap;color:#475569}
td.bar-cell{width:100%;padding:5px 8px}
.bar-wrap{background:#f1f5f9;border-radius:4px;height:8px;overflow:hidden}
.bar{background:#6366f1;height:100%;border-radius:4px}
table.results td.bar-cell{min-width:80px}
.question{display:flex;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px}
.answered{color:#22c55e;font-size:11px;flex-shrink:0;margin-top:2px}
@media print{body{padding:20px 28px}@page{margin:.8cm}}
</style>
</head>
<body>
<h1>${session.title}</h1>
<p class="meta">Код: ${session.join_code} · Экспорт: ${date}</p>
<div class="section"><h2>Результаты опросов</h2>${pollsHtml || "<p>Нет опросов</p>"}</div>
${questionsHtml}
<script>window.onload=function(){window.print()}<\/script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" className="text-sm" onClick={() => setOpen((v) => !v)}>
        Экспорт ↓
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          <button
            type="button"
            onClick={exportCSV}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <span>📄</span>
            <div>
              <p className="font-medium leading-tight">CSV</p>
              <p className="text-xs text-slate-400">Excel, Google Sheets</p>
            </div>
          </button>
          <button
            type="button"
            onClick={exportPDF}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border-t border-slate-100 dark:border-slate-800"
          >
            <span>🖨️</span>
            <div>
              <p className="font-medium leading-tight">PDF</p>
              <p className="text-xs text-slate-400">Печать / сохранить PDF</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

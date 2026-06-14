export function buildCsvRows(
  poll: { type: string },
  valueCounts: Record<string, number>,
  voteCount: number,
): string[][] {
  if (poll.type === "word_cloud" || poll.type === "emoji_cloud") {
    const rows: string[][] = [["Значение", "Кол-во"]];
    Object.entries(valueCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => rows.push([k, String(v)]));
    return rows;
  }
  if (poll.type === "like_dislike") {
    const likes = valueCounts["like"] ?? 0;
    const dislikes = valueCounts["dislike"] ?? 0;
    return [
      ["Вариант", "Голосов", "Процент"],
      ["👍 Нравится", String(likes), voteCount > 0 ? `${Math.round((likes / voteCount) * 100)}%` : "0%"],
      ["👎 Не нравится", String(dislikes), voteCount > 0 ? `${Math.round((dislikes / voteCount) * 100)}%` : "0%"],
    ];
  }
  const rows: string[][] = [["Вариант", "Голосов", "Процент"]];
  Object.entries(valueCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => rows.push([k, String(v), voteCount > 0 ? `${Math.round((v / voteCount) * 100)}%` : "0%"]));
  return rows;
}
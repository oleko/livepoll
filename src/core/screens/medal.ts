/** 🥇🥈🥉 for the top 3 ranks (0-indexed), "N." otherwise. Used at every leaderboard render site. */
export function medalFor(rank0: number): string {
  if (rank0 === 0) return "🥇";
  if (rank0 === 1) return "🥈";
  if (rank0 === 2) return "🥉";
  return `${rank0 + 1}.`;
}

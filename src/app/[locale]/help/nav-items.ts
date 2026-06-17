export const NAV_ITEMS = [
  { slug: "getting-started", icon: "🚀" },
  { slug: "participants",    icon: "📱" },
  { slug: "poll-types",     icon: "📊" },
  { slug: "display-screen", icon: "📺" },
  { slug: "slides",         icon: "📽" },
  { slug: "qa-and-ai",      icon: "✨" },
  { slug: "plans",          icon: "💳" },
  { slug: "team",           icon: "👥" },
  { slug: "account",        icon: "👤" },
  { slug: "changelog",      icon: "📋" },
];

export function slugToNavKey(slug: string): string {
  return slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

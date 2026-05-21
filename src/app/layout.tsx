import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CookieBanner } from "@/components/CookieBanner";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "LivePoll AI",
  description: "Интерактивные голосования для живых мероприятий",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full dark" suppressHydrationWarning>
      <head>
        {/* Anti-flash: apply theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}`,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col antialiased bg-white dark:bg-slate-950`}>
        <ThemeProvider>{children}</ThemeProvider>
        <CookieBanner />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { I18nProvider } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { TopNavigation } from "@/components/top-navigation";
import { getServerI18n } from "@/lib/i18n-server";

import "./globals.css";

export const metadata: Metadata = {
  title: "Private Light Novel AI Translator Reader",
  description: "A private reading-focused app for books, chapters, and AI translation.",
};

const themeInitScript = `
  try {
    var savedTheme = window.localStorage.getItem("astralnova_theme");
    document.documentElement.dataset.theme = savedTheme === "dark" ? "dark" : "light";
    document.documentElement.style.colorScheme = document.documentElement.dataset.theme;
  } catch (error) {
    document.documentElement.dataset.theme = "light";
  }
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, messages } = await getServerI18n();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <I18nProvider locale={locale} messages={messages}>
          <div className="shell">
            <header className="topbar">
              <Link className="brand" href="/">
                <span className="brand-mark">LN</span>
                <span className="brand-copy">
                  <strong>{messages.appTitle}</strong>
                  <span>{messages.appSubtitle}</span>
                </span>
              </Link>
              <div className="topbar-actions">
                <TopNavigation />
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            </header>
            <div className="site-frame">{children}</div>
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}

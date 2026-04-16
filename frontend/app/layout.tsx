import type { Metadata } from "next";
import Link from "next/link";

import { I18nProvider } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { TopNavigation } from "@/components/top-navigation";
import { getServerI18n } from "@/lib/i18n-server";

import "./globals.css";

export const metadata: Metadata = {
  title: "Private Light Novel AI Translator Reader",
  description: "A private reading-focused app for books, chapters, and AI translation.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, messages } = await getServerI18n();

  return (
    <html lang={locale}>
      <body>
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

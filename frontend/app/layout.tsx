import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Private Light Novel AI Translator Reader",
  description: "A private reading-focused app for books, chapters, and AI translation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link className="brand" href="/">
              <span className="brand-mark">LN</span>
              <span className="brand-copy">
                <strong>Private Light Novel Reader</strong>
                <span>Reading, import, settings, and glossary</span>
              </span>
            </Link>
            <nav className="topnav">
              <Link href="/">Bookshelf</Link>
              <Link href="/settings">Settings</Link>
              <Link href="/glossary">Glossary</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
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
            <a className="brand" href="/">
              <span className="brand-mark">LN</span>
              <span className="brand-copy">
                <strong>Private Light Novel Reader</strong>
                <span>Phase 3 frontend basics</span>
              </span>
            </a>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

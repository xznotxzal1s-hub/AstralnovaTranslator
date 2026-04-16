"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/components/i18n-provider";

export function TopNavigation() {
  const pathname = usePathname();
  const { t } = useI18n();

  const links = [
    { href: "/", label: t("navBookshelf"), active: pathname === "/" || pathname.startsWith("/books/") },
    { href: "/settings", label: t("navSettings"), active: pathname === "/settings" },
    { href: "/glossary", label: t("navGlossary"), active: pathname === "/glossary" },
  ];

  return (
    <nav className="topnav">
      {links.map((link) => (
        <Link key={link.href} className={link.active ? "active" : ""} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

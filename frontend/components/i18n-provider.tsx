"use client";

import { createContext, useContext } from "react";

import { formatMessage, type Locale, type MessageKey, type Messages } from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = {
  children: React.ReactNode;
  locale: Locale;
  messages: Messages;
};

export function I18nProvider({ children, locale, messages }: I18nProviderProps) {
  function t(key: MessageKey, values?: Record<string, string | number>) {
    const template = messages[key];
    return values ? formatMessage(template, values) : template;
  }

  return <I18nContext.Provider value={{ locale, messages, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === null) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return context;
}

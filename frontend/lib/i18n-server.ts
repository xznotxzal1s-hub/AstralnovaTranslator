import { cookies } from "next/headers";

import { getMessages, normalizeLocale, UI_LOCALE_COOKIE } from "@/lib/i18n";

export async function getServerI18n() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(UI_LOCALE_COOKIE)?.value);

  return {
    locale,
    messages: getMessages(locale),
  };
}

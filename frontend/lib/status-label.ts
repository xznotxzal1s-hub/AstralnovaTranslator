import type { Messages } from "@/lib/i18n";

export function getLocalizedStatus(status: string, messages: Messages): string {
  if (status === "translated") {
    return messages.statusTranslated;
  }

  if (status === "failed") {
    return messages.statusFailed;
  }

  return messages.statusPending;
}

import { messages } from "@masari/i18n";
import { getRequestConfig } from "next-intl/server";

/** Arabic-only for now; add locales here (and in @masari/i18n) to enable English. */
export default getRequestConfig(async () => ({
  locale: "ar",
  messages: messages.ar,
  timeZone: "Asia/Riyadh",
}));

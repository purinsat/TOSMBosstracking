"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

export function PromoSection() {
  const { t } = useLocale();
  return (
    <section className="mt-1 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-center">
      <p className="text-base text-slate-200">
        {t("promo.subscribe")}{" "}
        <a
          href="https://www.youtube.com/@KRUN-KID"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sky-300 underline underline-offset-4"
        >
          youtube.com/@KRUN-KID
        </a>
      </p>
      <p className="mt-2 text-sm text-slate-300">
        {t("promo.support")}{" "}
        <a
          href="https://tipme.in.th/ponderingth"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sky-300 underline underline-offset-4"
        >
          tipme.in.th/ponderingth
        </a>
      </p>
      <p className="mt-2 text-sm text-slate-400">{t("promo.thanks")}</p>
    </section>
  );
}

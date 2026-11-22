"use client";
import { useT } from "@/lib/i18n";
import { Button, EmptyState } from "@/components/ui";

/** Stare de eroare prietenoasă pentru orice pagină. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { t } = useT();
  return <EmptyState emoji="😕" title={t("common.error")} action={<Button onClick={reset}>{t("common.retry")}</Button>} />;
}

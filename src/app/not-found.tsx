"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { Button, EmptyState } from "@/components/ui";

export default function NotFound() {
  const { t } = useT();
  return <EmptyState emoji="🥄" title={t("err.404")} action={<Link href="/"><Button>{t("nav.home")}</Button></Link>} />;
}

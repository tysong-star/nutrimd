"use client";
import { useMemo } from "react";
import { DEMO_REVIEWS } from "@/data/workouts";
import { useApp } from "./store";
import type { Review } from "./types";

/** Toate recenziile (demo + utilizator) cu statusul de moderare aplicat. */
export function useAllReviews(): Review[] {
  const user = useApp((s) => s.userReviews);
  const status = useApp((s) => s.admin.reviewStatus);
  return useMemo(() => [...user, ...DEMO_REVIEWS].map((r) => (status[r.id] ? { ...r, status: status[r.id] } : r)), [user, status]);
}

export function ratingOf(reviews: Review[], recipeId: string) {
  const list = reviews.filter((r) => r.recipeId === recipeId && r.status === "approved");
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  return { avg, count: list.length, list };
}

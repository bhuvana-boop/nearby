"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Keeps boards live: re-fetches server data every few seconds unless the person is typing or editing. */
export default function AutoRefresh({ seconds = 8 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      const a = document.activeElement;
      if (a && ["INPUT", "TEXTAREA", "SELECT"].includes(a.tagName)) return;
      if (document.querySelector("details.edit[open], details.add[open]")) return;
      router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

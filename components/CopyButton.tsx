"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export default function CopyButton({ text, label = "Copy", className = "btn btn-sm", iconOnly = false }: { text: string; label?: string; className?: string; iconOnly?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`${className}${iconOnly ? " icon-btn" : ""}`}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const t = document.createElement("textarea");
          t.value = text;
          document.body.appendChild(t);
          t.select();
          document.execCommand("copy");
          t.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? <Check /> : <Copy />}
      {!iconOnly && (done ? "Copied" : label)}
    </button>
  );
}

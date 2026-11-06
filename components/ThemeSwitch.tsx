"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";

function apply(mode: Mode) {
  const el = document.documentElement;
  if (mode === "system") delete el.dataset.theme;
  else el.dataset.theme = mode;
  try {
    localStorage.setItem("nearby-theme", mode);
  } catch {}
}

export default function ThemeSwitch({ labels = false }: { labels?: boolean }) {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    try {
      const m = localStorage.getItem("nearby-theme") as Mode | null;
      if (m === "light" || m === "dark" || m === "system") setMode(m);
    } catch {}
  }, []);
  const opts: [Mode, React.ReactNode, string][] = [
    ["light", <Sun key="s" />, "Light"],
    ["dark", <Moon key="m" />, "Dark"],
    ["system", <Monitor key="a" />, "Auto"],
  ];
  return (
    <div className="theme-switch" role="radiogroup" aria-label="Theme">
      {opts.map(([m, icon, label]) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          title={label}
          className={mode === m ? "on" : ""}
          onClick={() => {
            setMode(m);
            apply(m);
          }}
        >
          {icon}
          {labels && label}
        </button>
      ))}
    </div>
  );
}

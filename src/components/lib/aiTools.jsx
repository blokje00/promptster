import React from "react";

/**
 * TASK-1 (icons): AI coding tools with a fixed brand color + monogram icon.
 * Selecting a tool in the project dialog also sets the matching project
 * `color`, so all existing color consumers (badges, borders) keep working.
 */
export const AI_TOOL_META = {
  Claude:   { color: "orange", monogram: "C",  bg: "bg-orange-500" },
  Qoder:    { color: "indigo", monogram: "Q",  bg: "bg-indigo-500" },
  Hermes:   { color: "green",  monogram: "H",  bg: "bg-green-500" },
  Kimi:     { color: "blue",   monogram: "K",  bg: "bg-blue-500" },
  Cursor:   { color: "purple", monogram: "Cu", bg: "bg-purple-500" },
  Copilot:  { color: "yellow", monogram: "Co", bg: "bg-yellow-500" },
  Windsurf: { color: "pink",   monogram: "W",  bg: "bg-pink-500" },
  Other:    { color: "red",    monogram: "?",  bg: "bg-red-500" },
};

export const AI_TOOLS = Object.keys(AI_TOOL_META);

const SIZES = {
  sm: "w-4 h-4 text-[8px]",
  md: "w-6 h-6 text-[10px]",
  lg: "w-8 h-8 text-xs",
};

/**
 * Colored monogram badge for an AI tool. Falls back to a neutral dot
 * when the project has no tool set.
 */
export function AiToolIcon({ tool, size = "md", className = "" }) {
  const meta = AI_TOOL_META[tool];
  if (!meta) {
    return <span className={`inline-block rounded-full bg-slate-400 ${size === "sm" ? "w-2 h-2" : "w-3 h-3"} ${className}`} />;
  }
  return (
    <span
      title={tool}
      className={`inline-flex items-center justify-center rounded-md font-bold text-white shrink-0 ${meta.bg} ${SIZES[size] || SIZES.md} ${className}`}
    >
      {meta.monogram}
    </span>
  );
}

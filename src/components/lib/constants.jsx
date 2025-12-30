
/**
 * @file Shared constants for project colors and support tickets
 */

export const projectColors = {
  red: "bg-red-500 hover:bg-red-600",
  orange: "bg-orange-500 hover:bg-orange-600",
  yellow: "bg-yellow-500 hover:bg-yellow-600",
  green: "bg-green-500 hover:bg-green-600",
  blue: "bg-blue-500 hover:bg-blue-600",
  indigo: "bg-indigo-500 hover:bg-indigo-600",
  purple: "bg-purple-500 hover:bg-purple-600",
  pink: "bg-pink-500 hover:bg-pink-600"
};

export const projectBorderColors = {
  red: "border-red-500",
  orange: "border-orange-500",
  yellow: "border-yellow-500",
  green: "border-green-500",
  blue: "border-blue-500",
  indigo: "border-indigo-500",
  purple: "border-purple-500",
  pink: "border-pink-500"
};

export const projectLightColors = {
  red: "bg-red-50 text-red-700 border-red-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  green: "bg-green-50 text-green-700 border-green-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  pink: "bg-pink-50 text-pink-700 border-pink-200"
};

export const categoryLabels = {
  bug: { label: "🐛 Bug", color: "bg-red-100 text-red-700 border-red-300" },
  payment: { label: "💳 Payment", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  feature: { label: "✨ Feature", color: "bg-purple-100 text-purple-700 border-purple-300" },
  other: { label: "❓ Other", color: "bg-slate-100 text-slate-700 border-slate-300" }
};

export const statusLabels = {
  open: { label: "Open", color: "bg-blue-100 text-blue-700 border-blue-300" },
  in_progress: { label: "In Progress", color: "bg-orange-100 text-orange-700 border-orange-300" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700 border-green-300" },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-700 border-slate-300" }
};

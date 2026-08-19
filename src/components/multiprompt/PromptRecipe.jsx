import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { User, FolderCog, Brain, Braces, PlayCircle, ListChecks, StopCircle, Pencil, Bot } from "lucide-react";
import { createPageUrl } from "@/utils";

/**
 * TASK-1: Prompt Recipe — single panel showing ALL blocks that make up the
 * final multiprompt, in the exact order they are assembled. Replaces the
 * scattered "Personal Prefs"/"Project Config" checkboxes + separate template
 * card. Every optional block gets a toggle; auto-injected blocks (Learned
 * Patterns, Response Parser) are now visible and controllable too.
 */

const TARGET_MODEL_OPTIONS = [
  { value: "gemini", label: "Gemini" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "claude-sonnet", label: "Claude Sonnet" },
  { value: "claude-opus", label: "Claude Opus" },
  { value: "llama", label: "Llama" },
  { value: "other", label: "Other" },
];

function RecipeRow({ step, icon: Icon, title, subtitle, active, disabled, control, editUrl }) {
  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg border transition-colors ${
      active && !disabled
        ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30"
        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 opacity-70"
    }`}>
      <span className="text-[10px] font-bold text-slate-400 w-4 text-center shrink-0">{step}</span>
      <Icon className={`w-4 h-4 shrink-0 ${active && !disabled ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{title}</p>
          {editUrl && (
            <Link to={editUrl} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0" title="Edit source">
              <Pencil className="w-3 h-3" />
            </Link>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function PromptRecipe({
  templates,
  templateSelection,
  selectedProject,
  currentUser,
  selectedTaskCount,
  targetModel,
  onTargetModelChange,
}) {
  const {
    startTemplateId, setStartTemplateId,
    endTemplateId, setEndTemplateId,
    includePersonalPrefs, setIncludePersonalPrefs,
    includeProjectConfig, setIncludeProjectConfig,
    includeLearnedPatterns, setIncludeLearnedPatterns,
    includeParserInstruction, setIncludeParserInstruction,
  } = templateSelection;

  const startTemplates = templates.filter(t => t.type === "start");
  const endTemplates = templates.filter(t => t.type === "eind");

  const hasPersonalPrefs = Boolean(currentUser?.personal_preferences_markdown);
  const hasProjectConfig = Boolean(selectedProject?.technical_config_markdown);
  const activePatterns = (selectedProject?.learnedPatterns || []).filter(p => p.is_active);
  const hasParser = Boolean(selectedProject?.llm_response_parser_instruction);

  const templateSelect = (value, onChange, options, placeholder) => (
    <Select value={value || undefined} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger className="h-8 w-[150px] text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">None</SelectItem>
        {options.map(t => (
          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Prompt Recipe</span>
          <span className="text-xs font-normal text-slate-400">assembled top → bottom</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Target model selector — compact, at the top of the recipe */}
        <div className="flex items-center gap-3 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <Bot className="w-4 h-4 shrink-0 text-slate-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Target AI Model</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Which LLM this prompt is written for</p>
          </div>
          <select
            value={targetModel || ""}
            onChange={e => onTargetModelChange(e.target.value)}
            className="h-8 w-[150px] text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">Not set</option>
            {TARGET_MODEL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <RecipeRow
          step="1"
          icon={User}
          title="Personal Prefs"
          subtitle={hasPersonalPrefs ? "Your reusable AI preferences" : "Not set — click ✎ to add"}
          active={includePersonalPrefs}
          disabled={!hasPersonalPrefs}
          editUrl={createPageUrl("AIBackoffice")}
          control={<Switch checked={includePersonalPrefs} onCheckedChange={setIncludePersonalPrefs} />}
        />
        <RecipeRow
          step="2"
          icon={FolderCog}
          title="Project Config"
          subtitle={selectedProject ? (hasProjectConfig ? selectedProject.name : "Empty for this project") : "Select a project first"}
          active={includeProjectConfig}
          disabled={!hasProjectConfig}
          control={<Switch checked={includeProjectConfig} onCheckedChange={setIncludeProjectConfig} />}
        />
        <RecipeRow
          step="3"
          icon={Brain}
          title="Learned Patterns"
          subtitle={activePatterns.length > 0 ? `${activePatterns.length} active pattern(s)` : "None active for this project"}
          active={includeLearnedPatterns}
          disabled={activePatterns.length === 0}
          control={<Switch checked={includeLearnedPatterns} onCheckedChange={setIncludeLearnedPatterns} />}
        />
        <RecipeRow
          step="4"
          icon={Braces}
          title="Response Parser"
          subtitle={hasParser ? "Project parser instruction" : "Not set for this project"}
          active={includeParserInstruction}
          disabled={!hasParser}
          control={<Switch checked={includeParserInstruction} onCheckedChange={setIncludeParserInstruction} />}
        />
        <RecipeRow
          step="5"
          icon={PlayCircle}
          title="Start Template"
          subtitle={templates.find(t => t.id === startTemplateId)?.content?.slice(0, 60) || "No start text"}
          active={Boolean(startTemplateId)}
          control={templateSelect(startTemplateId, setStartTemplateId, startTemplates, "None")}
        />
        <RecipeRow
          step="6"
          icon={ListChecks}
          title="Tasks (JSON block)"
          subtitle={`${selectedTaskCount} task(s) selected`}
          active={selectedTaskCount > 0}
          control={<span className="text-xs font-semibold text-slate-500">{selectedTaskCount}</span>}
        />
        <RecipeRow
          step="7"
          icon={StopCircle}
          title="End Template"
          subtitle={templates.find(t => t.id === endTemplateId)?.content?.slice(0, 60) || "No end text"}
          active={Boolean(endTemplateId)}
          control={templateSelect(endTemplateId, setEndTemplateId, endTemplates, "None")}
        />
      </CardContent>
    </Card>
  );
}

export default React.memo(PromptRecipe);

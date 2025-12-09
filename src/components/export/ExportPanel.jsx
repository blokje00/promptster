import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileJson, FileSpreadsheet, Calendar as CalendarIcon, Filter, RefreshCw, Loader2 } from "lucide-react";
import { format, subDays, startOfMonth, subMonths, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function ExportPanel({ 
  items = [], 
  mode = 'vault', // 'vault' or 'single'
  singleItemId = null,
  showTypeFilter = true,
  showCheckFilter = true,
  customTitle = null,
  className = ""
}) {
  const [dateRange, setDateRange] = useState("all");
  const [customDate, setCustomDate] = useState({ from: undefined, to: undefined });
  const [typeFilter, setTypeFilter] = useState("all");
  const [checkStatusFilter, setCheckStatusFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  // Calculate filtered data for counts preview
  const stats = useMemo(() => {
    let filteredItems = mode === 'single' && singleItemId 
      ? items.filter(i => i.id === singleItemId)
      : [...items];

    // 1. Date Filter
    if (dateRange !== 'all') {
      const now = new Date();
      let start, end;

      switch (dateRange) {
        case 'today':
          start = startOfDay(now);
          end = endOfDay(now);
          break;
        case '7days':
          start = subDays(now, 7);
          end = now;
          break;
        case '30days':
          start = subDays(now, 30);
          end = now;
          break;
        case 'thisMonth':
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
        case 'prevMonth':
          start = startOfMonth(subMonths(now, 1));
          end = endOfMonth(subMonths(now, 1));
          break;
        case 'custom':
          if (customDate?.from) start = customDate.from;
          if (customDate?.to) end = customDate.to;
          break;
      }

      if (start) {
        filteredItems = filteredItems.filter(i => {
            const d = new Date(i.created_date);
            return d >= start && (!end || d <= end);
        });
      }
    }

    // 2. Type Filter
    if (typeFilter !== 'all') {
      if (typeFilter === 'multiprompt') {
        filteredItems = filteredItems.filter(i => i.type === 'multiprompt');
      } else if (typeFilter === 'single') {
        filteredItems = filteredItems.filter(i => i.type !== 'multiprompt');
      }
    }

    // 3. Count Checks
    let checkCount = 0;
    filteredItems.forEach(i => {
      if (i.task_checks) {
        if (checkStatusFilter === 'all') {
          checkCount += i.task_checks.length;
        } else {
          checkCount += i.task_checks.filter(c => (c.status || 'open') === checkStatusFilter).length;
        }
      }
    });

    const multipromptCount = filteredItems.filter(i => i.type === 'multiprompt').length;
    const promptCount = filteredItems.length - multipromptCount;

    return {
      itemCount: filteredItems.length,
      multiprompts: multipromptCount,
      prompts: promptCount,
      checks: checkCount
    };
  }, [items, dateRange, customDate, typeFilter, checkStatusFilter, mode, singleItemId]);

  /**
   * Client-side export - haalt alle data op en genereert CSV + JSON bestanden
   * @param {"csv" | "json" | "both"} formatType
   */
  const handleExport = async (formatType) => {
    setIsExporting(true);
    try {
      // 1. FETCH ALL DATA from Base44 entities
      const userEmail = (await base44.auth.me())?.email;
      if (!userEmail) throw new Error("User not authenticated");

      const [allItems, allThoughts, allTemplates, allAISettings, allProjects] = await Promise.all([
        base44.entities.Item.filter({ created_by: userEmail }),
        base44.entities.Thought.filter({ created_by: userEmail }),
        base44.entities.PromptTemplate.filter({ created_by: userEmail }),
        base44.entities.AISettings.filter({ created_by: userEmail }),
        base44.entities.Project.filter({ created_by: userEmail })
      ]);

      // 2. APPLY FILTERS (date, type, check status)
      let filteredItems = mode === 'single' && singleItemId 
        ? allItems.filter(i => i.id === singleItemId)
        : [...allItems];

      // Date filter
      if (dateRange !== 'all') {
        const now = new Date();
        let start, end;

        switch (dateRange) {
          case 'today':
            start = startOfDay(now);
            end = endOfDay(now);
            break;
          case '7days':
            start = subDays(now, 7);
            end = now;
            break;
          case '30days':
            start = subDays(now, 30);
            end = now;
            break;
          case 'thisMonth':
            start = startOfMonth(now);
            end = endOfMonth(now);
            break;
          case 'prevMonth':
            start = startOfMonth(subMonths(now, 1));
            end = endOfMonth(subMonths(now, 1));
            break;
          case 'custom':
            if (customDate?.from) start = customDate.from;
            if (customDate?.to) end = customDate.to;
            break;
        }

        if (start) {
          filteredItems = filteredItems.filter(i => {
            const d = new Date(i.created_date);
            return d >= start && (!end || d <= end);
          });
        }
      }

      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'multiprompt') {
          filteredItems = filteredItems.filter(i => i.type === 'multiprompt');
        } else if (typeFilter === 'single') {
          filteredItems = filteredItems.filter(i => i.type !== 'multiprompt');
        }
      }

      // 3. EXTRACT ALL CHECKS from filtered items
      let allChecks = [];
      filteredItems.forEach(item => {
        if (item.task_checks && Array.isArray(item.task_checks)) {
          item.task_checks.forEach((check, idx) => {
            // Apply check status filter
            const checkStatus = check.status || 'open';
            if (checkStatusFilter === 'all' || checkStatus === checkStatusFilter) {
              allChecks.push({
                item_id: item.id,
                item_title: item.title,
                check_index: idx,
                task_name: check.task_name || '',
                full_description: check.full_description || '',
                status: checkStatus,
                is_checked: check.is_checked || false,
                created_date: check.created_date || item.created_date,
                updated_date: check.updated_date || item.updated_date
              });
            }
          });
        }
      });

      // 4. BUILD EXPORT DATA OBJECT
      const exportData = {
        metadata: {
          exported_at: new Date().toISOString(),
          exported_by: userEmail,
          filters_applied: {
            dateRange,
            typeFilter,
            checkStatusFilter
          },
          counts: {
            items: filteredItems.length,
            checks: allChecks.length,
            templates: allTemplates.length,
            ai_settings: allAISettings.length,
            projects: allProjects.length,
            thoughts: allThoughts.length
          }
        },
        items: filteredItems.map(item => ({
          id: item.id,
          title: item.title,
          type: item.type,
          content: item.content,
          description: item.description,
          tags: item.tags || [],
          language: item.language,
          project_id: item.project_id,
          is_favorite: item.is_favorite,
          status: item.status,
          created_date: item.created_date,
          updated_date: item.updated_date,
          is_publish_version: item.is_publish_version,
          publish_timestamp: item.publish_timestamp,
          publish_working_notes: item.publish_working_notes,
          publish_reason: item.publish_reason,
          notes: item.notes,
          start_template_id: item.start_template_id,
          end_template_id: item.end_template_id,
          used_thoughts: item.used_thoughts || []
        })),
        checks: allChecks,
        templates: allTemplates.map(t => ({
          id: t.id,
          name: t.name,
          type: t.type,
          content: t.content,
          project_id: t.project_id,
          created_date: t.created_date
        })),
        ai_settings: allAISettings.map(s => ({
          id: s.id,
          improve_prompt_instruction: s.improve_prompt_instruction,
          model_preference: s.model_preference,
          enable_context_suggestions: s.enable_context_suggestions,
          created_date: s.created_date
        })),
        projects: allProjects.map(p => ({
          id: p.id,
          name: p.name,
          color: p.color,
          description: p.description,
          created_date: p.created_date
        })),
        thoughts: allThoughts.map(t => ({
          id: t.id,
          content: t.content,
          project_id: t.project_id,
          focus_type: t.focus_type,
          target_page: t.target_page,
          target_component: t.target_component,
          target_domain: t.target_domain,
          is_deleted: t.is_deleted,
          created_date: t.created_date
        }))
      };

      // 5. GENERATE FILES
      const timestamp = new Date().toISOString().split('T')[0];

      if (formatType === 'json' || formatType === 'both') {
        // JSON Export
        const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        downloadBlob(jsonBlob, `promptster_vault_${timestamp}.json`);
      }

      if (formatType === 'csv' || formatType === 'both') {
        // CSV Export - create separate CSV for each entity type
        const csvFiles = [];

        // Items CSV
        csvFiles.push({
          name: `items_${timestamp}.csv`,
          content: convertToCSV(exportData.items, ['id', 'title', 'type', 'content', 'description', 'tags', 'language', 'project_id', 'is_favorite', 'status', 'created_date', 'updated_date'])
        });

        // Checks CSV
        csvFiles.push({
          name: `checks_${timestamp}.csv`,
          content: convertToCSV(exportData.checks, ['item_id', 'item_title', 'check_index', 'task_name', 'full_description', 'status', 'is_checked', 'created_date', 'updated_date'])
        });

        // Templates CSV
        csvFiles.push({
          name: `templates_${timestamp}.csv`,
          content: convertToCSV(exportData.templates, ['id', 'name', 'type', 'content', 'project_id', 'created_date'])
        });

        // AI Settings CSV
        csvFiles.push({
          name: `ai_settings_${timestamp}.csv`,
          content: convertToCSV(exportData.ai_settings, ['id', 'improve_prompt_instruction', 'model_preference', 'enable_context_suggestions', 'created_date'])
        });

        // Projects CSV
        csvFiles.push({
          name: `projects_${timestamp}.csv`,
          content: convertToCSV(exportData.projects, ['id', 'name', 'color', 'description', 'created_date'])
        });

        // Thoughts CSV
        csvFiles.push({
          name: `thoughts_${timestamp}.csv`,
          content: convertToCSV(exportData.thoughts, ['id', 'content', 'project_id', 'focus_type', 'target_page', 'target_component', 'is_deleted', 'created_date'])
        });

        // Download each CSV
        csvFiles.forEach(file => {
          const csvBlob = new Blob([file.content], { type: 'text/csv;charset=utf-8;' });
          downloadBlob(csvBlob, file.name);
        });
      }

      toast.success(`Export completed: ${formatType.toUpperCase()} file(s) downloaded`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Export failed: " + (error.message || "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };

  // Helper function to download a blob
  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      a.remove();
    }, 100);
  };

  // Helper function to convert array of objects to CSV
  const convertToCSV = (data, columns) => {
    if (!data || data.length === 0) {
      return columns.join(',') + '\n';
    }

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const header = columns.join(',');
    const rows = data.map(row => 
      columns.map(col => escapeCSV(row[col])).join(',')
    );

    return header + '\n' + rows.join('\n');
  };

  const title = customTitle || (mode === 'vault' ? 'Export Vault' : 'Export This Prompt');

  return (
    <Card className={`bg-white border-indigo-100 ${className}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-indigo-900 flex items-center gap-2">
              <Download className="w-4 h-4" /> 
              {title}
            </h3>
            <div className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full font-medium">
               {stats.itemCount} items • {stats.multiprompts} multis • {stats.checks} checks
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap gap-2 items-center">
            
            {/* Date Filter */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <CalendarIcon className="w-3 h-3 mr-2" />
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="prevMonth">Last Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Picker */}
            {dateRange === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    {customDate?.from ? (
                      customDate.to ? (
                        `${format(customDate.from, "LLL dd")} - ${format(customDate.to, "LLL dd")}`
                      ) : (
                        format(customDate.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={customDate?.from}
                    selected={customDate}
                    onSelect={setCustomDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Item Type Filter */}
            {showTypeFilter && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <Filter className="w-3 h-3 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="multiprompt">Multiprompts</SelectItem>
                  <SelectItem value="single">Single Prompts</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Check Status Filter */}
            {showCheckFilter && (
              <Select value={checkStatusFilter} onValueChange={setCheckStatusFilter}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <RefreshCw className="w-3 h-3 mr-2" />
                  <SelectValue placeholder="Check Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Checks</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="retried">Retried</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-indigo-50">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 border-slate-200 hover:bg-slate-50 text-slate-700"
              onClick={() => handleExport('csv')}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />}
              CSV Export
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1 border-slate-200 hover:bg-slate-50 text-slate-700"
              onClick={() => handleExport('json')}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileJson className="w-4 h-4 mr-2 text-orange-600" />}
              JSON Export
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
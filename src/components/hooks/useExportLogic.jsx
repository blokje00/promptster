import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { subDays, startOfMonth, subMonths, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";

/**
 * Hook for export logic - filtering, data fetching, file generation
 */
export function useExportLogic({ items, mode, singleItemId, dateRange, customDate, typeFilter, checkStatusFilter }) {
  const [isExporting, setIsExporting] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    let filteredItems = mode === 'single' && singleItemId 
      ? items.filter(i => i.id === singleItemId)
      : [...items];

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

    // Count checks
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

  const handleExport = async (formatType) => {
    setIsExporting(true);
    try {
      const userEmail = (await base44.auth.me())?.email;
      if (!userEmail) throw new Error("User not authenticated");

      const [allItems, allThoughts, allTemplates, allAISettings, allProjects] = await Promise.all([
        base44.entities.Item.filter({ created_by: userEmail }),
        base44.entities.Thought.filter({ created_by: userEmail }),
        base44.entities.PromptTemplate.filter({ created_by: userEmail }),
        base44.entities.AISettings.filter({ created_by: userEmail }),
        base44.entities.Project.filter({ created_by: userEmail })
      ]);

      // Apply filters (same logic as stats)
      let filteredItems = mode === 'single' && singleItemId 
        ? allItems.filter(i => i.id === singleItemId)
        : [...allItems];

      // Date filtering (reuse logic from stats)
      if (dateRange !== 'all') {
        const now = new Date();
        let start, end;
        switch (dateRange) {
          case 'today': start = startOfDay(now); end = endOfDay(now); break;
          case '7days': start = subDays(now, 7); end = now; break;
          case '30days': start = subDays(now, 30); end = now; break;
          case 'thisMonth': start = startOfMonth(now); end = endOfMonth(now); break;
          case 'prevMonth': start = startOfMonth(subMonths(now, 1)); end = endOfMonth(subMonths(now, 1)); break;
          case 'custom': 
            if (customDate?.from) start = customDate.from;
            if (customDate?.to) end = customDate.to;
            break;
        }
        if (start) filteredItems = filteredItems.filter(i => {
          const d = new Date(i.created_date);
          return d >= start && (!end || d <= end);
        });
      }

      // Type filtering
      if (typeFilter === 'multiprompt') {
        filteredItems = filteredItems.filter(i => i.type === 'multiprompt');
      } else if (typeFilter === 'single') {
        filteredItems = filteredItems.filter(i => i.type !== 'multiprompt');
      }

      // Extract checks
      let allChecks = [];
      filteredItems.forEach(item => {
        if (item.task_checks && Array.isArray(item.task_checks)) {
          item.task_checks.forEach((check, idx) => {
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

      const exportData = {
        metadata: {
          exported_at: new Date().toISOString(),
          exported_by: userEmail,
          filters_applied: { dateRange, typeFilter, checkStatusFilter },
          counts: {
            items: filteredItems.length,
            checks: allChecks.length,
            templates: allTemplates.length,
            ai_settings: allAISettings.length,
            projects: allProjects.length,
            thoughts: allThoughts.length
          }
        },
        items: filteredItems,
        checks: allChecks,
        templates: allTemplates,
        ai_settings: allAISettings,
        projects: allProjects,
        thoughts: allThoughts
      };

      const timestamp = new Date().toISOString().split('T')[0];
      const { downloadFile, generateCSV, generateJSON } = await import("@/components/lib/exportGenerators");

      if (formatType === 'json' || formatType === 'both') {
        generateJSON(exportData, `promptster_vault_${timestamp}.json`);
      }

      if (formatType === 'csv' || formatType === 'both') {
        generateCSV(exportData, timestamp);
      }

      toast.success(`Export completed: ${formatType.toUpperCase()} file(s) downloaded`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Export failed: " + (error.message || "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };

  return { stats, handleExport, isExporting };
}
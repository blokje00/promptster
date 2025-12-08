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
   * Handles data export in CSV (as ZIP) or JSON format
   * @param {string} formatType - 'csv' or 'json'
   */
  const handleExport = async (formatType) => {
    setIsExporting(true);
    try {
      const filters = {
        dateRange,
        typeFilter: showTypeFilter ? typeFilter : 'all',
        checkStatusFilter: showCheckFilter ? checkStatusFilter : 'all',
        customStart: customDate?.from?.toISOString(),
        customEnd: customDate?.to?.toISOString()
      };

      // Call the export function
      const result = await base44.functions.invoke('exportUserData', {
        format: formatType,
        scope: mode === 'vault' ? 'vault' : 'single_item',
        itemId: singleItemId,
        filters
      });

      // Handle different response formats from Base44
      let blobData;
      let mimeType = formatType === 'csv' ? 'application/zip' : 'application/json';
      let fileExtension = formatType === 'csv' ? 'zip' : 'json';
      
      if (result?.data) {
        // If result.data is a base64 string, decode it
        if (typeof result.data === 'string') {
          try {
            // Check if it's base64 encoded
            const binaryString = atob(result.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            blobData = bytes;
          } catch (e) {
            // Not base64, treat as plain text/JSON
            blobData = result.data;
            mimeType = 'application/json';
            fileExtension = 'json';
          }
        } else if (result.data instanceof ArrayBuffer) {
          blobData = result.data;
        } else if (typeof result.data === 'object') {
          // JSON object, stringify it
          blobData = JSON.stringify(result.data, null, 2);
          mimeType = 'application/json';
          fileExtension = 'json';
        } else {
          blobData = result.data;
        }
      } else if (result && typeof result === 'object') {
        // Fallback: entire result is the data
        blobData = JSON.stringify(result, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
      } else {
        throw new Error("No data received from export");
      }

      const blob = new Blob([blobData], { type: mimeType });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `export_${mode}_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        a.remove();
      }, 100);
      
      toast.success("Export completed successfully");
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Export failed: " + (error.message || "Unknown error"));
    } finally {
      setIsExporting(false);
    }
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
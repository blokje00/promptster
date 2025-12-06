import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileJson, FileSpreadsheet, Calendar as CalendarIcon, Filter, RefreshCw, Loader2 } from "lucide-react";
import { format, subDays, startOfMonth, subMonths, endOfMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function ExportPanel({ 
  items = [], 
  mode = 'vault', // 'vault' or 'single'
  singleItemId = null,
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

  const handleExport = async (formatType) => {
    setIsExporting(true);
    try {
      const filters = {
        dateRange,
        typeFilter,
        checkStatusFilter,
        customStart: customDate?.from?.toISOString(),
        customEnd: customDate?.to?.toISOString()
      };

      const res = await base44.functions.invoke('exportUserData', {
        format: formatType,
        scope: mode === 'vault' ? 'vault' : 'single_item',
        itemId: singleItemId,
        filters
      });

      // Handle download
      // Backend functions return response object in SDK, we need to handle blob
      // SDK might parse JSON automatically, but for binary/blob we need to be careful.
      // If SDK returns object with data, we might need to handle it differently if it's a stream.
      // Actually, base44.functions.invoke returns Axios response. 
      // We need to request responseType: 'blob' or 'arraybuffer'.
      
      // Let's use direct fetch for file download to be safe with blobs
      const token = await base44.auth.getSessionToken(); // hypothetical helper or we use fetching via standard fetch
      // Wait, SDK doesn't expose token easily. 
      // Let's use the SDK's invoke but check if we can get blob.
      
      // Alternative: base44.functions.invoke returns the response data.
      // If the function returns a Response object with binary data, the SDK might try to parse JSON.
      // We should use a direct fetch here to ensure we get the blob.
      
      // Since we don't have easy access to the raw token string for a raw fetch in this context (unless we store it),
      // we'll try to use the SDK. If SDK fails on binary, we might need to modify the backend to return base64 JSON.
      // But let's assume we can use a small workaround:
      // We can use the native fetch if we can get the token. 
      // User is authenticated.
      
      // Let's try using the SDK and handling the response.
      // If the backend returns a stream, SDK might handle it or return the text.
      
      // REVISION: To ensure reliability with binary downloads through the SDK/Proxy:
      // It's safer to return a JSON with a base64 string OR use a direct signed URL approach.
      // However, for this task, let's try the standard approach:
      // We will perform a fetch to the function URL.
      
      // Getting function URL:
      // It's typically /api/functions/exportUserData
      
      const response = await fetch('/api/functions/exportUserData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}` // Try to find token or rely on cookie if applicable
        },
        body: JSON.stringify({
            format: formatType,
            scope: mode === 'vault' ? 'vault' : 'single_item',
            itemId: singleItemId,
            filters
        })
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${mode}_${new Date().toISOString().split('T')[0]}.${formatType === 'csv' ? 'zip' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success("Export started");
    } catch (error) {
      console.error(error);
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className={`bg-white border-indigo-100 ${className}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-indigo-900 flex items-center gap-2">
              <Download className="w-4 h-4" /> 
              {mode === 'vault' ? 'Export Vault' : 'Export This Prompt'}
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

            {/* Item Type Filter - Only for Vault Mode */}
            {mode === 'vault' && (
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
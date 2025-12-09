import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import ExportFilters from "./ExportFilters";
import { useExportLogic } from "../hooks/useExportLogic";

export default function ExportPanel({ 
  items = [], 
  mode = 'vault',
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

  const { stats, handleExport, isExporting } = useExportLogic({
    items,
    mode,
    singleItemId,
    dateRange,
    customDate,
    typeFilter,
    checkStatusFilter
  });

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

          <ExportFilters
            dateRange={dateRange}
            setDateRange={setDateRange}
            customDate={customDate}
            setCustomDate={setCustomDate}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            checkStatusFilter={checkStatusFilter}
            setCheckStatusFilter={setCheckStatusFilter}
            showTypeFilter={showTypeFilter}
            showCheckFilter={showCheckFilter}
          />

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
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Filter, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function ExportFilters({
  dateRange,
  setDateRange,
  customDate,
  setCustomDate,
  typeFilter,
  setTypeFilter,
  checkStatusFilter,
  setCheckStatusFilter,
  showTypeFilter = true,
  showCheckFilter = true
}) {
  return (
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
  );
}
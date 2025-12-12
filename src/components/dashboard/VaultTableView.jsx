import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { projectColors } from "@/components/lib/constants";

export default function VaultTableView({ items, projects }) {
  const [sortConfig, setSortConfig] = useState({ key: "updated_date", direction: "desc" });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  const sortedAndFilteredItems = useMemo(() => {
    let result = [...items];

    // Date filter
    if (startDate || endDate) {
      result = result.filter(item => {
        const itemDate = new Date(item.created_date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate + "T23:59:59") : null;
        
        if (start && end) return itemDate >= start && itemDate <= end;
        if (start) return itemDate >= start;
        if (end) return itemDate <= end;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let aVal, bVal;

      switch (sortConfig.key) {
        case "title":
          aVal = a.title || "";
          bVal = b.title || "";
          return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        
        case "type":
          aVal = a.type || "";
          bVal = b.type || "";
          return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        
        case "project":
          const projectA = projects.find(p => p.id === a.project_id)?.name || "";
          const projectB = projects.find(p => p.id === b.project_id)?.name || "";
          return sortConfig.direction === "asc" ? projectA.localeCompare(projectB) : projectB.localeCompare(projectA);
        
        case "created_date":
        case "updated_date":
          aVal = new Date(a[sortConfig.key] || 0);
          bVal = new Date(b[sortConfig.key] || 0);
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        
        default:
          return 0;
      }
    });

    return result;
  }, [items, projects, sortConfig, startDate, endDate]);

  const getTypeLabel = (type) => {
    const labels = {
      prompt: "Prompt",
      multiprompt: "Multi-Task",
      code: "Code",
      snippet: "Snippet",
      idee: "Idea"
    };
    return labels[type] || type;
  };

  const getTypeBadge = (type) => {
    const colors = {
      prompt: "bg-purple-100 text-purple-700 border-purple-200",
      multiprompt: "bg-indigo-100 text-indigo-700 border-indigo-200",
      code: "bg-blue-100 text-blue-700 border-blue-200",
      snippet: "bg-green-100 text-green-700 border-green-200",
      idee: "bg-yellow-100 text-yellow-700 border-yellow-200"
    };
    return colors[type] || "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Date Filters */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex gap-4 items-center">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>From:</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 w-40"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>To:</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 w-40"
          />
        </label>
        {(startDate || endDate) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setStartDate(""); setEndDate(""); }}
            className="text-xs"
          >
            Clear
          </Button>
        )}
        <div className="ml-auto text-sm text-slate-500 dark:text-slate-400">
          {sortedAndFilteredItems.length} items
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th 
                className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => handleSort("title")}
              >
                <div className="flex items-center gap-2">
                  Title
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 w-32"
                onClick={() => handleSort("type")}
              >
                <div className="flex items-center gap-2">
                  Type
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 w-40"
                onClick={() => handleSort("project")}
              >
                <div className="flex items-center gap-2">
                  Project
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 w-32"
                onClick={() => handleSort("created_date")}
              >
                <div className="flex items-center gap-2">
                  Created
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 w-32"
                onClick={() => handleSort("updated_date")}
              >
                <div className="flex items-center gap-2">
                  Updated
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400 w-20">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {sortedAndFilteredItems.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  No items found
                </td>
              </tr>
            ) : (
              sortedAndFilteredItems.map((item) => {
                const project = projects.find(p => p.id === item.project_id);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-md">
                        {item.title}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${getTypeBadge(item.type)}`}>
                        {getTypeLabel(item.type)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {project ? (
                        <Badge className={`${projectColors[project.color]} text-white text-xs`}>
                          {project.name}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {item.created_date ? format(new Date(item.created_date), "dd-MM-yyyy") : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {item.updated_date ? format(new Date(item.updated_date), "dd-MM-yyyy") : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={createPageUrl("ViewItem") + `?id=${item.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
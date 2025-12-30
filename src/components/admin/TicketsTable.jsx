import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, Loader2, Ticket } from "lucide-react";
import { format } from "date-fns";
import { categoryLabels, statusLabels } from "@/components/lib/constants";

export default function TicketsTable({ 
  tickets, 
  sortField, 
  sortDirection, 
  onSort, 
  onSelectTicket, 
  onStatusChange,
  isLoading 
}) {
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center p-12 text-slate-500">
        <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No tickets found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer hover:bg-slate-50" onClick={() => onSort("created_date")}>
              <div className="flex items-center">
                Date
                <SortIcon field="created_date" />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-slate-50" onClick={() => onSort("category")}>
              <div className="flex items-center">
                Category
                <SortIcon field="category" />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-slate-50" onClick={() => onSort("subject")}>
              <div className="flex items-center">
                Subject
                <SortIcon field="subject" />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-slate-50" onClick={() => onSort("user_name")}>
              <div className="flex items-center">
                User
                <SortIcon field="user_name" />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-slate-50" onClick={() => onSort("status")}>
              <div className="flex items-center">
                Status
                <SortIcon field="status" />
              </div>
            </TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow 
              key={ticket.id} 
              className="hover:bg-slate-50 cursor-pointer"
              onClick={() => onSelectTicket(ticket)}
            >
              <TableCell className="text-sm text-slate-600">
                {ticket.created_date ? format(new Date(ticket.created_date), "d MMM yyyy HH:mm") : "—"}
              </TableCell>
              <TableCell>
                <Badge className={categoryLabels[ticket.category]?.color || "bg-slate-100"}>
                  {categoryLabels[ticket.category]?.label || ticket.category}
                </Badge>
              </TableCell>
              <TableCell className="font-medium max-w-[300px] truncate">
                {ticket.subject}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <p className="font-medium">{ticket.user_name || "—"}</p>
                  <p className="text-slate-500 text-xs">{ticket.user_email}</p>
                </div>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Select 
                  value={ticket.status} 
                  onValueChange={(newStatus) => onStatusChange(ticket.id, newStatus)}
                >
                  <SelectTrigger className={`w-[130px] h-8 text-xs ${statusLabels[ticket.status]?.color || ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTicket(ticket);
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
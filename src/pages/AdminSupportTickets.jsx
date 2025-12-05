import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Ticket, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Filter,
  Eye,
  Loader2,
  ShieldAlert,
  Calendar,
  User,
  Mail
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const categoryLabels = {
  bug: { label: "🐛 Bug", color: "bg-red-100 text-red-700 border-red-300" },
  payment: { label: "💳 Betaling", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  feature: { label: "✨ Feature", color: "bg-purple-100 text-purple-700 border-purple-300" },
  other: { label: "❓ Overig", color: "bg-slate-100 text-slate-700 border-slate-300" }
};

const statusLabels = {
  open: { label: "Open", color: "bg-blue-100 text-blue-700 border-blue-300" },
  in_progress: { label: "In behandeling", color: "bg-orange-100 text-orange-700 border-orange-300" },
  resolved: { label: "Opgelost", color: "bg-green-100 text-green-700 border-green-300" },
  closed: { label: "Gesloten", color: "bg-slate-100 text-slate-700 border-slate-300" }
};

export default function AdminSupportTickets() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("created_date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Check if user is admin
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch all support tickets (admin only via RLS)
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['supportTickets'],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
    enabled: currentUser?.role === 'admin',
  });

  // Filter and sort tickets
  const filteredTickets = tickets
    .filter(ticket => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        ticket.subject?.toLowerCase().includes(searchLower) ||
        ticket.message?.toLowerCase().includes(searchLower) ||
        ticket.user_email?.toLowerCase().includes(searchLower) ||
        ticket.user_name?.toLowerCase().includes(searchLower);
      
      // Category filter
      const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter;
      
      // Status filter
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      // Handle dates
      if (sortField === "created_date") {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }
      
      // Handle strings
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      
      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Loading state
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Not admin - show access denied
  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Geen toegang</h2>
            <p className="text-slate-600">
              Deze pagina is alleen beschikbaar voor administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Ticket className="w-8 h-8 text-indigo-600" />
            Support Tickets
          </h1>
          <p className="text-slate-600 mt-1">
            Beheer alle support aanvragen ({filteredTickets.length} van {tickets.length} tickets)
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Zoek op onderwerp, bericht, email of naam..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle categorieën</SelectItem>
                    <SelectItem value="bug">🐛 Bug</SelectItem>
                    <SelectItem value="payment">💳 Betaling</SelectItem>
                    <SelectItem value="feature">✨ Feature</SelectItem>
                    <SelectItem value="other">❓ Overig</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In behandeling</SelectItem>
                  <SelectItem value="resolved">Opgelost</SelectItem>
                  <SelectItem value="closed">Gesloten</SelectItem>
                </SelectContent>
              </Select>

              {/* Reset Filters */}
              {(searchQuery || categoryFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Reset filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card>
          <CardContent className="p-0">
            {ticketsLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center p-12 text-slate-500">
                <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Geen tickets gevonden</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => handleSort("created_date")}
                      >
                        <div className="flex items-center">
                          Datum
                          <SortIcon field="created_date" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => handleSort("category")}
                      >
                        <div className="flex items-center">
                          Categorie
                          <SortIcon field="category" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => handleSort("subject")}
                      >
                        <div className="flex items-center">
                          Onderwerp
                          <SortIcon field="subject" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => handleSort("user_name")}
                      >
                        <div className="flex items-center">
                          Gebruiker
                          <SortIcon field="user_name" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center">
                          Status
                          <SortIcon field="status" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[80px]">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <TableRow 
                        key={ticket.id} 
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <TableCell className="text-sm text-slate-600">
                          {ticket.created_date 
                            ? format(new Date(ticket.created_date), "d MMM yyyy HH:mm", { locale: nl })
                            : "—"
                          }
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
                        <TableCell>
                          <Badge className={statusLabels[ticket.status]?.color || "bg-slate-100"}>
                            {statusLabels[ticket.status]?.label || ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(ticket);
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
            )}
          </CardContent>
        </Card>

        {/* Ticket Detail Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-600" />
                Ticket Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedTicket && (
              <div className="space-y-6 pt-4">
                {/* Meta info */}
                <div className="flex flex-wrap gap-3">
                  <Badge className={categoryLabels[selectedTicket.category]?.color}>
                    {categoryLabels[selectedTicket.category]?.label}
                  </Badge>
                  <Badge className={statusLabels[selectedTicket.status]?.color}>
                    {statusLabels[selectedTicket.status]?.label}
                  </Badge>
                </div>

                {/* Subject */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    {selectedTicket.subject}
                  </h3>
                </div>

                {/* User info */}
                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{selectedTicket.user_name || "Onbekend"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a 
                      href={`mailto:${selectedTicket.user_email}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {selectedTicket.user_email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {selectedTicket.created_date 
                      ? format(new Date(selectedTicket.created_date), "EEEE d MMMM yyyy 'om' HH:mm", { locale: nl })
                      : "—"
                    }
                  </div>
                </div>

                {/* Message */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Bericht</h4>
                  <div className="p-4 bg-white border rounded-lg whitespace-pre-wrap text-slate-700">
                    {selectedTicket.message}
                  </div>
                </div>

                {/* Quick reply link */}
                <div className="pt-4 border-t flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      window.open(`mailto:${selectedTicket.user_email}?subject=Re: ${encodeURIComponent(selectedTicket.subject)}`, '_blank');
                    }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Reply via email
                  </Button>
                  <TicketStatusChanger 
                    ticket={selectedTicket} 
                    onStatusChange={(newStatus) => {
                      handleStatusChange(selectedTicket.id, newStatus);
                    }}
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
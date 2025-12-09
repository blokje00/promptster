import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, User, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";
import { categoryLabels, statusLabels } from "@/components/lib/constants";

export default function TicketDetailDialog({ ticket, onClose, onStatusChange }) {
  if (!ticket) return null;

  return (
    <Dialog open={!!ticket} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-indigo-600" />
            Ticket Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Meta info */}
          <div className="flex flex-wrap gap-3">
            <Badge className={categoryLabels[ticket.category]?.color}>
              {categoryLabels[ticket.category]?.label}
            </Badge>
            <Badge className={statusLabels[ticket.status]?.color}>
              {statusLabels[ticket.status]?.label}
            </Badge>
          </div>

          {/* Subject */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              {ticket.subject}
            </h3>
          </div>

          {/* User info */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-medium">{ticket.user_name || "Unknown"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-slate-400" />
              <a 
                href={`mailto:${ticket.user_email}`}
                className="text-indigo-600 hover:underline"
              >
                {ticket.user_email}
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4 text-slate-400" />
              {ticket.created_date ? format(new Date(ticket.created_date), "EEEE d MMMM yyyy 'at' HH:mm") : "—"}
            </div>
          </div>

          {/* Message */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Message</h4>
            <div className="p-4 bg-white border rounded-lg whitespace-pre-wrap text-slate-700">
              {ticket.message}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                window.open(`mailto:${ticket.user_email}?subject=Re: ${encodeURIComponent(ticket.subject)}`, '_blank');
              }}
            >
              <Mail className="w-4 h-4 mr-2" />
              Reply via email
            </Button>
            <Select 
              value={ticket.status} 
              onValueChange={(newStatus) => onStatusChange(ticket.id, newStatus)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
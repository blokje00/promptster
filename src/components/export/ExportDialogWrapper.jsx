import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ExportPanel from "@/components/export/ExportPanel";
import { Loader2 } from "lucide-react";

export default function ExportDialogWrapper({ onClose }) {
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Item.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center flex-col gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Loading your vault data...</p>
      </div>
    );
  }

  return (
    <ExportPanel 
      items={items} 
      mode="vault" 
      showTypeFilter={true} 
      showCheckFilter={true}
      className="border-0 shadow-none"
    />
  );
}
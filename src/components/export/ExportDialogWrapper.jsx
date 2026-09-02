import { items as itemsApi } from "@/api";
import ExportPanel from "@/components/export/ExportPanel";
import { Loader2 } from "lucide-react";

export default function ExportDialogWrapper() {
  const { data: items = [], isLoading } = itemsApi.useList();

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
import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Circle, CheckCircle2, XCircle } from "lucide-react";

export default function StatusSelector({ status, onChange }) {
  return (
    <div className="space-y-2">
      <Label>Status</Label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={status === "open" ? "default" : "outline"}
          size="sm"
          onClick={() => onChange("open")}
          className={status === "open" ? "bg-blue-500 hover:bg-blue-600" : ""}
        >
          <Circle className="w-4 h-4 mr-2" />
          Open
        </Button>
        <Button
          type="button"
          variant={status === "success" ? "default" : "outline"}
          size="sm"
          onClick={() => onChange("success")}
          className={status === "success" ? "bg-green-500 hover:bg-green-600" : ""}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Success
        </Button>
        <Button
          type="button"
          variant={status === "failed" ? "default" : "outline"}
          size="sm"
          onClick={() => onChange("failed")}
          className={status === "failed" ? "bg-red-500 hover:bg-red-600" : ""}
        >
          <XCircle className="w-4 h-4 mr-2" />
          Failed
        </Button>
      </div>
    </div>
  );
}
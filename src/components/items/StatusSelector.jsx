import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Circle, CheckCircle2, XCircle } from "lucide-react";
import { ITEM_STATUS } from "@/components/lib/status";

export default function StatusSelector({ status, onChange }) {
  return (
    <div className="space-y-2">
      <Label>Status</Label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={status === ITEM_STATUS.OPEN ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(ITEM_STATUS.OPEN)}
          className={status === ITEM_STATUS.OPEN ? "bg-blue-500 hover:bg-blue-600" : ""}
        >
          <Circle className="w-4 h-4 mr-2" />
          Open
        </Button>
        <Button
          type="button"
          variant={status === ITEM_STATUS.SUCCESS ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(ITEM_STATUS.SUCCESS)}
          className={status === ITEM_STATUS.SUCCESS ? "bg-green-500 hover:bg-green-600" : ""}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Success
        </Button>
        <Button
          type="button"
          variant={status === ITEM_STATUS.FAILED ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(ITEM_STATUS.FAILED)}
          className={status === ITEM_STATUS.FAILED ? "bg-red-500 hover:bg-red-600" : ""}
        >
          <XCircle className="w-4 h-4 mr-2" />
          Failed
        </Button>
      </div>
    </div>
  );
}
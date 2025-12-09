import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { GitBranch } from "lucide-react";

export default function PublishVersionSection({ formData, onChange }) {
  const handleTogglePublish = (checked) => {
    const now = new Date();
    const timestamp = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    onChange({
      ...formData, 
      is_publish_version: checked,
      publish_timestamp: checked ? timestamp : formData.publish_timestamp
    });
  };

  return (
    <Card className="shadow-lg border-slate-200">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-green-600" />
          Publish Version
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_publish"
            checked={formData.is_publish_version}
            onCheckedChange={handleTogglePublish}
          />
          <label
            htmlFor="is_publish"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            This is a Publish version / stable timestamp
          </label>
        </div>

        {formData.is_publish_version && (
          <>
            <div className="space-y-2">
              <Label htmlFor="publish_timestamp">Publish Date/Time</Label>
              <Input
                id="publish_timestamp"
                type="datetime-local"
                value={formData.publish_timestamp}
                onChange={(e) => onChange({...formData, publish_timestamp: e.target.value})}
                className="border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publish_working_notes">What worked well?</Label>
              <Textarea
                id="publish_working_notes"
                placeholder="Describe what was working well at this point..."
                value={formData.publish_working_notes}
                onChange={(e) => onChange({...formData, publish_working_notes: e.target.value})}
                className="min-h-[100px] border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publish_reason">Why this Publish version?</Label>
              <Textarea
                id="publish_reason"
                placeholder="Explain why you're creating this Publish version..."
                value={formData.publish_reason}
                onChange={(e) => onChange({...formData, publish_reason: e.target.value})}
                className="min-h-[100px] border-slate-200"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
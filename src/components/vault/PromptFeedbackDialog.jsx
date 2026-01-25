import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ThumbsUp, ThumbsDown, Star, Meh } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const RATING_OPTIONS = [
  { value: "excellent", label: "Excellent", icon: Star, color: "text-green-600" },
  { value: "good", label: "Good", icon: ThumbsUp, color: "text-blue-600" },
  { value: "okay", label: "Okay", icon: Meh, color: "text-yellow-600" },
  { value: "poor", label: "Poor", icon: ThumbsDown, color: "text-red-600" }
];

/**
 * Dialog voor gebruikers om feedback te geven op een gegenereerde prompt
 * Dit wordt gebruikt voor de Self-Evolving Feedback Loop
 */
export default function PromptFeedbackDialog({ 
  open, 
  onClose, 
  item,
  promptUsed,
  projectId,
  usedTemplates = []
}) {
  const [rating, setRating] = useState("good");
  const [whatWorked, setWhatWorked] = useState("");
  const [whatFailed, setWhatFailed] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!rating) {
      toast.error("Please select a rating");
      return;
    }

    setIsSaving(true);
    try {
      await base44.entities.PromptFeedback.create({
        item_id: item.id,
        prompt_used: promptUsed,
        rating,
        what_worked: whatWorked || "",
        what_failed: whatFailed || "",
        notes: notes || "",
        project_id: projectId || "",
        used_templates: usedTemplates,
        applied_to_preferences: false
      });

      toast.success("Feedback saved! AI will learn from this.");
      onClose();
      
      // Reset form
      setRating("good");
      setWhatWorked("");
      setWhatFailed("");
      setNotes("");
    } catch (error) {
      console.error("Feedback save error:", error);
      toast.error("Failed to save feedback");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>📊 Prompt Feedback</DialogTitle>
          <p className="text-sm text-slate-600">
            Help the AI learn from this prompt result for <span className="font-semibold">{item?.title}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rating Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">How well did this prompt work?</Label>
            <div className="grid grid-cols-4 gap-2">
              {RATING_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setRating(option.value)}
                    className={`
                      p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2
                      ${rating === option.value 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950' 
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}
                    `}
                  >
                    <Icon className={`w-6 h-6 ${rating === option.value ? 'text-indigo-600' : option.color}`} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* What Worked */}
          <div>
            <Label htmlFor="whatWorked" className="text-sm font-medium mb-2 block">
              What worked well? 🎯
            </Label>
            <Textarea
              id="whatWorked"
              value={whatWorked}
              onChange={(e) => setWhatWorked(e.target.value)}
              placeholder="E.g., Clear task structure, good level of detail, helpful context..."
              className="min-h-[80px]"
            />
          </div>

          {/* What Failed */}
          <div>
            <Label htmlFor="whatFailed" className="text-sm font-medium mb-2 block">
              What didn't work? ⚠️
            </Label>
            <Textarea
              id="whatFailed"
              value={whatFailed}
              onChange={(e) => setWhatFailed(e.target.value)}
              placeholder="E.g., Too vague, missing context, wrong tone..."
              className="min-h-[80px]"
            />
          </div>

          {/* Extra Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
              Additional notes (optional) 📝
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other observations or suggestions..."
              className="min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
            {isSaving ? "Saving..." : "Submit Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
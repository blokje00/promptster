/**
 * UltimateToggle Pattern
 * 
 * Simpelste en meest robuuste toggle pattern voor React + shadcn/ui Switch
 * 
 * Regels:
 * 1. Controlled input (formData is single source of truth)
 * 2. Gebruik setFormData(prev => ...) om stale state te voorkomen
 * 3. Geen effects, refs of DOM listeners
 * 4. Clear dependent fields wanneer toggle uit gaat
 * 5. Normaliseer booleans in payload (!! operator)
 */

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * BASIC TOGGLE (zonder dependent fields)
 */
function BasicToggleExample({ formData, setFormData }) {
  return (
    <div className="flex items-center gap-2">
      <Switch 
        checked={!!formData.is_active} 
        onCheckedChange={(checked) => 
          setFormData((p) => ({ ...p, is_active: checked }))
        } 
      />
      <Label>Active</Label>
    </div>
  );
}

/**
 * TOGGLE MET DEPENDENT FIELD (auto-clear bij toggle off)
 */
function ToggleWithDependentFieldExample({ formData, setFormData }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Switch 
          checked={!!formData.show_trial_badge} 
          onCheckedChange={(checked) => 
            setFormData((p) => ({ 
              ...p, 
              show_trial_badge: checked,
              trial_badge_text: checked ? p.trial_badge_text : "" // Clear als toggle uit gaat
            }))
          } 
        />
        <Label>Show Trial Badge</Label>
      </div>
      
      {/* Conditional render: alleen tonen als toggle aan staat */}
      {formData.show_trial_badge && (
        <div>
          <Label className="text-xs text-slate-500">Custom Badge Text (optional)</Label>
          <Input 
            value={formData.trial_badge_text} 
            onChange={(e) => 
              setFormData((p) => ({ ...p, trial_badge_text: e.target.value }))
            } 
            placeholder="e.g. 14 days free"
          />
        </div>
      )}
    </div>
  );
}

/**
 * SAVE PAYLOAD NORMALISATIE
 * 
 * Altijd normaliseren bij save om undefined/null te voorkomen:
 */
function normalizePayload(formData) {
  return {
    ...formData,
    is_active: !!formData.is_active,
    show_trial_badge: !!formData.show_trial_badge,
    trial_badge_text: (formData.trial_badge_text || "").trim(),
    show_max_tasks_badge: !!formData.show_max_tasks_badge,
    max_tasks_badge_text: (formData.max_tasks_badge_text || "").trim(),
  };
}

/**
 * DISPLAY PATTERN (in read-only view)
 * 
 * Toggle bepaalt of iets getoond wordt:
 */
function DisplayExample({ plan }) {
  return (
    <>
      {plan.show_trial_badge && plan.trial_days > 0 && (
        <span className="font-medium text-green-600">
          {plan.trial_badge_text || `Trial: ${plan.trial_days} dagen`}
        </span>
      )}
    </>
  );
}

/**
 * VOLLEDIGE IMPLEMENTATIE (zoals in AdminSubscription)
 */
export function CompleteToggleExample() {
  const [formData, setFormData] = useState({
    show_trial_badge: true,
    trial_badge_text: "",
    show_max_tasks_badge: true,
    max_tasks_badge_text: "",
    is_active: true
  });

  const handleSave = async () => {
    const payload = {
      ...formData,
      show_trial_badge: !!formData.show_trial_badge,
      trial_badge_text: (formData.trial_badge_text || "").trim(),
      show_max_tasks_badge: !!formData.show_max_tasks_badge,
      max_tasks_badge_text: (formData.max_tasks_badge_text || "").trim(),
      is_active: !!formData.is_active
    };
    
    // Save to API...
  };

  return (
    <div className="space-y-4">
      {/* Trial Badge Toggle + Dependent Field */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Switch 
            checked={!!formData.show_trial_badge} 
            onCheckedChange={(checked) => 
              setFormData((p) => ({ 
                ...p, 
                show_trial_badge: checked,
                trial_badge_text: checked ? p.trial_badge_text : ""
              }))
            } 
          />
          <Label>Show Trial Badge</Label>
        </div>
        {formData.show_trial_badge && (
          <div>
            <Label className="text-xs text-slate-500">Custom Trial Badge Text (optional)</Label>
            <Input 
              value={formData.trial_badge_text} 
              onChange={(e) => 
                setFormData((p) => ({ ...p, trial_badge_text: e.target.value }))
              } 
              placeholder="e.g. 14 days free (no CC)"
            />
          </div>
        )}
      </div>

      {/* Max Tasks Badge Toggle + Dependent Field */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Switch 
            checked={!!formData.show_max_tasks_badge} 
            onCheckedChange={(checked) => 
              setFormData((p) => ({ 
                ...p, 
                show_max_tasks_badge: checked,
                max_tasks_badge_text: checked ? p.max_tasks_badge_text : ""
              }))
            } 
          />
          <Label>Show Max Tasks Badge</Label>
        </div>
        {formData.show_max_tasks_badge && (
          <div>
            <Label className="text-xs text-slate-500">Custom Max Tasks Badge Text (optional)</Label>
            <Input 
              value={formData.max_tasks_badge_text} 
              onChange={(e) => 
                setFormData((p) => ({ ...p, max_tasks_badge_text: e.target.value }))
              } 
              placeholder="e.g. Max Tasks: 20"
            />
          </div>
        )}
      </div>

      {/* Simple Toggle */}
      <div className="flex items-center gap-2">
        <Switch 
          checked={!!formData.is_active} 
          onCheckedChange={(checked) => 
            setFormData((p) => ({ ...p, is_active: checked }))
          } 
        />
        <Label>Active</Label>
      </div>
    </div>
  );
}

/**
 * WHY THIS WORKS:
 * 
 * ✅ Controlled: checked is altijd boolean (!!formData.x)
 * ✅ No stale state: setFormData(prev => ...) gebruikt altijd fresh state
 * ✅ Auto-cleanup: dependent fields worden gecleared bij toggle off
 * ✅ Conditional render: {formData.x && <Input />} zorgt voor clean UI
 * ✅ Normalized save: !! en .trim() voorkomen undefined/null in DB
 * ✅ No side effects: geen useEffect, refs, of DOM listeners nodig
 * 
 * Deze pattern is identiek aan UltimateSaveButton (React onClick + state),
 * simpel, voorspelbaar, en altijd betrouwbaar.
 */
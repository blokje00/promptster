import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, FileText, Database, Workflow, Navigation, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import PagesStep from "./wizard-steps/PagesStep";
import EntitiesStep from "./wizard-steps/EntitiesStep";
import WorkflowsStep from "./wizard-steps/WorkflowsStep";
import NavigationStep from "./wizard-steps/NavigationStep";
import ReviewStep from "./wizard-steps/ReviewStep";

const WIZARD_STEPS = [
  { id: "pages", title: "Pages", icon: FileText },
  { id: "entities", title: "Entities", icon: Database },
  { id: "workflows", title: "Workflows", icon: Workflow },
  { id: "navigation", title: "Navigation", icon: Navigation },
  { id: "review", title: "Review", icon: CheckCircle2 }
];

export default function StructureWizard({ existingStructure, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState({
    pages: existingStructure?.pages?.length ? [] : [{ name: "", route: "", page_type: "other", description: "" }],
    entities: existingStructure?.entities?.length ? [] : [{ name: "", description: "", fields: [] }],
    workflows: [],
    navigation: []
  });

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const addItem = (type, template) => setWizardData(prev => ({ ...prev, [type]: [...prev[type], template] }));
  const removeItem = (type, index) => setWizardData(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== index) }));
  const updateItem = (type, index, field, value) => setWizardData(prev => ({ ...prev, [type]: prev[type].map((item, i) => i === index ? { ...item, [field]: value } : item) }));
  
  const addFieldToEntity = (entityIndex) => setWizardData(prev => ({
    ...prev,
    entities: prev.entities.map((entity, i) => i === entityIndex ? { ...entity, fields: [...entity.fields, { name: "", type: "string" }] } : entity)
  }));
  
  const updateEntityField = (entityIndex, fieldIndex, key, value) => setWizardData(prev => ({
    ...prev,
    entities: prev.entities.map((entity, i) => i === entityIndex ? { ...entity, fields: entity.fields.map((field, fi) => fi === fieldIndex ? { ...field, [key]: value } : field) } : entity)
  }));
  
  const removeEntityField = (entityIndex, fieldIndex) => setWizardData(prev => ({
    ...prev,
    entities: prev.entities.map((entity, i) => i === entityIndex ? { ...entity, fields: entity.fields.filter((_, fi) => fi !== fieldIndex) } : entity)
  }));

  const handleComplete = () => {
    const cleanData = {
      pages: wizardData.pages.filter(p => p.name.trim()),
      entities: wizardData.entities.filter(e => e.name.trim()),
      workflows: wizardData.workflows.filter(w => w.name.trim()),
      navigation: wizardData.navigation.filter(n => n.label.trim())
    };

    const totalItems = cleanData.pages.length + cleanData.entities.length + cleanData.workflows.length + cleanData.navigation.length;

    if (totalItems === 0) {
      toast.error("Add at least one item");
      return;
    }

    onComplete(cleanData, { wizard_version: "1.0", items_count: totalItems });
    toast.success(`${totalItems} items added via wizard!`);
  };

  const renderStepContent = () => {
    const step = WIZARD_STEPS[currentStep];

    switch (step.id) {
      case "pages":
        return <PagesStep pages={wizardData.pages} onUpdate={(i, f, v) => updateItem("pages", i, f, v)} onAdd={(t) => addItem("pages", t)} onRemove={(i) => removeItem("pages", i)} />;
      case "entities":
        return <EntitiesStep entities={wizardData.entities} onUpdate={(i, f, v) => updateItem("entities", i, f, v)} onAdd={(t) => addItem("entities", t)} onRemove={(i) => removeItem("entities", i)} onAddField={addFieldToEntity} onUpdateField={updateEntityField} onRemoveField={removeEntityField} />;
      case "workflows":
        return <WorkflowsStep workflows={wizardData.workflows} onUpdate={(i, f, v) => updateItem("workflows", i, f, v)} onAdd={(t) => addItem("workflows", t)} onRemove={(i) => removeItem("workflows", i)} />;
      case "navigation":
        return <NavigationStep navigation={wizardData.navigation} onUpdate={(i, f, v) => updateItem("navigation", i, f, v)} onAdd={(t) => addItem("navigation", t)} onRemove={(i) => removeItem("navigation", i)} />;
      case "review":
        return <ReviewStep wizardData={wizardData} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{WIZARD_STEPS[currentStep].title}</span>
          <span className="text-slate-500">Step {currentStep + 1} of {WIZARD_STEPS.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between">
          {WIZARD_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                  index === currentStep ? "text-purple-700 bg-purple-100" : index < currentStep ? "text-green-600" : "text-slate-400"
                }`}
              >
                <Icon className="w-3 h-3" />
                {step.title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[300px]">{renderStepContent()}</div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))} disabled={currentStep === 0}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        {currentStep < WIZARD_STEPS.length - 1 ? (
          <Button onClick={() => setCurrentStep(prev => Math.min(WIZARD_STEPS.length - 1, prev + 1))} className="bg-purple-600 hover:bg-purple-700">
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Save
          </Button>
        )}
      </div>
    </div>
  );
}
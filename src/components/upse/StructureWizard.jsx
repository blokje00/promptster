import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  X, 
  Wand2,
  FileText,
  Database,
  Workflow,
  Navigation,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

const WIZARD_STEPS = [
  { id: "pages", title: "Pagina's", icon: FileText },
  { id: "entities", title: "Entiteiten", icon: Database },
  { id: "workflows", title: "Workflows", icon: Workflow },
  { id: "navigation", title: "Navigatie", icon: Navigation },
  { id: "review", title: "Overzicht", icon: CheckCircle2 }
];

/**
 * Structure Wizard component
 * Stap-voor-stap wizard om projectstructuur handmatig in te voeren
 */
export default function StructureWizard({ existingStructure, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState({
    pages: existingStructure?.pages?.length ? [] : [{ name: "", route: "", page_type: "other", description: "" }],
    entities: existingStructure?.entities?.length ? [] : [{ name: "", description: "", fields: [] }],
    workflows: [],
    navigation: []
  });

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  /**
   * Voegt een nieuw item toe aan een lijst
   */
  const addItem = (type, template) => {
    setWizardData(prev => ({
      ...prev,
      [type]: [...prev[type], template]
    }));
  };

  /**
   * Verwijdert een item uit een lijst
   */
  const removeItem = (type, index) => {
    setWizardData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  /**
   * Update een item in een lijst
   */
  const updateItem = (type, index, field, value) => {
    setWizardData(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  /**
   * Voegt een veld toe aan een entity
   */
  const addFieldToEntity = (entityIndex) => {
    setWizardData(prev => ({
      ...prev,
      entities: prev.entities.map((entity, i) => 
        i === entityIndex 
          ? { ...entity, fields: [...entity.fields, { name: "", type: "string" }] }
          : entity
      )
    }));
  };

  /**
   * Update een veld van een entity
   */
  const updateEntityField = (entityIndex, fieldIndex, key, value) => {
    setWizardData(prev => ({
      ...prev,
      entities: prev.entities.map((entity, i) => 
        i === entityIndex 
          ? {
              ...entity,
              fields: entity.fields.map((field, fi) =>
                fi === fieldIndex ? { ...field, [key]: value } : field
              )
            }
          : entity
      )
    }));
  };

  /**
   * Verwijdert een veld van een entity
   */
  const removeEntityField = (entityIndex, fieldIndex) => {
    setWizardData(prev => ({
      ...prev,
      entities: prev.entities.map((entity, i) => 
        i === entityIndex 
          ? { ...entity, fields: entity.fields.filter((_, fi) => fi !== fieldIndex) }
          : entity
      )
    }));
  };

  /**
   * Voltooit de wizard en slaat op
   */
  const handleComplete = () => {
    // Filter lege items
    const cleanData = {
      pages: wizardData.pages.filter(p => p.name.trim()),
      entities: wizardData.entities.filter(e => e.name.trim()),
      workflows: wizardData.workflows.filter(w => w.name.trim()),
      navigation: wizardData.navigation.filter(n => n.label.trim())
    };

    const totalItems = cleanData.pages.length + cleanData.entities.length + 
                       cleanData.workflows.length + cleanData.navigation.length;

    if (totalItems === 0) {
      toast.error("Voeg minstens één item toe");
      return;
    }

    onComplete(cleanData, { wizard_version: "1.0", items_count: totalItems });
    toast.success(`${totalItems} items toegevoegd via wizard!`);
  };

  /**
   * Render step content
   */
  const renderStepContent = () => {
    const step = WIZARD_STEPS[currentStep];

    switch (step.id) {
      case "pages":
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Definieer de pagina's/schermen van je project. Geef elke pagina een naam en route.
            </p>
            {wizardData.pages.map((page, index) => (
              <Card key={index} className="border-slate-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Naam</Label>
                        <Input
                          placeholder="Dashboard, Orders, etc."
                          value={page.name}
                          onChange={(e) => updateItem("pages", index, "name", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Route</Label>
                        <Input
                          placeholder="/dashboard, /orders/:id"
                          value={page.route}
                          onChange={(e) => updateItem("pages", index, "route", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Beschrijving</Label>
                        <Input
                          placeholder="Overzicht met statistieken en recente items..."
                          value={page.description}
                          onChange={(e) => updateItem("pages", index, "description", e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem("pages", index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              onClick={() => addItem("pages", { name: "", route: "", page_type: "other", description: "" })}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Pagina Toevoegen
            </Button>
          </div>
        );

      case "entities":
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Definieer de data-entiteiten (tabellen/types) van je project met hun velden.
            </p>
            {wizardData.entities.map((entity, eIndex) => (
              <Card key={eIndex} className="border-slate-200">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Entity Naam</Label>
                        <Input
                          placeholder="Order, Customer, Task..."
                          value={entity.name}
                          onChange={(e) => updateItem("entities", eIndex, "name", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Beschrijving</Label>
                        <Input
                          placeholder="Bestellingen van klanten..."
                          value={entity.description}
                          onChange={(e) => updateItem("entities", eIndex, "description", e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem("entities", eIndex)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Fields */}
                  <div className="pl-4 border-l-2 border-slate-200 space-y-2">
                    <Label className="text-xs text-slate-500">Velden</Label>
                    {entity.fields.map((field, fIndex) => (
                      <div key={fIndex} className="flex items-center gap-2">
                        <Input
                          placeholder="veldnaam"
                          value={field.name}
                          onChange={(e) => updateEntityField(eIndex, fIndex, "name", e.target.value)}
                          className="flex-1"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => updateEntityField(eIndex, fIndex, "type", e.target.value)}
                          className="h-9 rounded-md border border-slate-200 px-2 text-sm"
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="date">Date</option>
                          <option value="enum">Enum</option>
                          <option value="json">JSON</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEntityField(eIndex, fIndex)}
                          className="text-red-500 h-8 w-8 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addFieldToEntity(eIndex)}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Veld
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              onClick={() => addItem("entities", { name: "", description: "", fields: [] })}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Entity Toevoegen
            </Button>
          </div>
        );

      case "workflows":
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Definieer workflows en automations (optioneel). Bijv. "Bij nieuwe order → verstuur email".
            </p>
            {wizardData.workflows.map((workflow, index) => (
              <Card key={index} className="border-slate-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label className="text-xs">Workflow Naam</Label>
                        <Input
                          placeholder="Nieuwe order notificatie..."
                          value={workflow.name}
                          onChange={(e) => updateItem("workflows", index, "name", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Trigger</Label>
                        <Input
                          placeholder="Wanneer een nieuwe Order wordt aangemaakt..."
                          value={workflow.trigger_description}
                          onChange={(e) => updateItem("workflows", index, "trigger_description", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Acties</Label>
                        <Textarea
                          placeholder="Stuur email naar klant, maak factuur aan..."
                          value={workflow.actions_description}
                          onChange={(e) => updateItem("workflows", index, "actions_description", e.target.value)}
                          className="min-h-[60px]"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem("workflows", index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              onClick={() => addItem("workflows", { name: "", trigger_description: "", actions_description: "", related_entities: [] })}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Workflow Toevoegen
            </Button>
          </div>
        );

      case "navigation":
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Definieer de navigatie-items (optioneel). Zoals menu-items in header of sidebar.
            </p>
            {wizardData.navigation.map((nav, index) => (
              <Card key={index} className="border-slate-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Label (Dashboard)"
                      value={nav.label}
                      onChange={(e) => updateItem("navigation", index, "label", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Route (/dashboard)"
                      value={nav.route}
                      onChange={(e) => updateItem("navigation", index, "route", e.target.value)}
                      className="flex-1"
                    />
                    <select
                      value={nav.position || "header"}
                      onChange={(e) => updateItem("navigation", index, "position", e.target.value)}
                      className="h-9 rounded-md border border-slate-200 px-2 text-sm"
                    >
                      <option value="header">Header</option>
                      <option value="sidebar">Sidebar</option>
                      <option value="footer">Footer</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem("navigation", index)}
                      className="text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              onClick={() => addItem("navigation", { label: "", route: "", position: "header", order: wizardData.navigation.length })}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Navigatie Item Toevoegen
            </Button>
          </div>
        );

      case "review":
        const counts = {
          pages: wizardData.pages.filter(p => p.name.trim()).length,
          entities: wizardData.entities.filter(e => e.name.trim()).length,
          workflows: wizardData.workflows.filter(w => w.name.trim()).length,
          navigation: wizardData.navigation.filter(n => n.label.trim()).length
        };

        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Controleer je invoer en klik op "Opslaan" om de structuur toe te voegen aan je project.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Pagina's</span>
                    <Badge className="bg-green-100 text-green-700">{counts.pages}</Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    {wizardData.pages.filter(p => p.name).map((p, i) => (
                      <div key={i} className="text-xs text-slate-600">• {p.name}</div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Entiteiten</span>
                    <Badge className="bg-blue-100 text-blue-700">{counts.entities}</Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    {wizardData.entities.filter(e => e.name).map((e, i) => (
                      <div key={i} className="text-xs text-slate-600">
                        • {e.name} ({e.fields.length} velden)
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Workflows</span>
                    <Badge className="bg-orange-100 text-orange-700">{counts.workflows}</Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    {wizardData.workflows.filter(w => w.name).map((w, i) => (
                      <div key={i} className="text-xs text-slate-600">• {w.name}</div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Navigatie</span>
                    <Badge className="bg-purple-100 text-purple-700">{counts.navigation}</Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    {wizardData.navigation.filter(n => n.label).map((n, i) => (
                      <div key={i} className="text-xs text-slate-600">• {n.label}</div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{WIZARD_STEPS[currentStep].title}</span>
          <span className="text-slate-500">Stap {currentStep + 1} van {WIZARD_STEPS.length}</span>
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
                  index === currentStep 
                    ? "text-purple-700 bg-purple-100" 
                    : index < currentStep
                      ? "text-green-600"
                      : "text-slate-400"
                }`}
              >
                <Icon className="w-3 h-3" />
                {step.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[300px]">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Vorige
        </Button>

        {currentStep < WIZARD_STEPS.length - 1 ? (
          <Button
            onClick={() => setCurrentStep(prev => Math.min(WIZARD_STEPS.length - 1, prev + 1))}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Volgende
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Opslaan
          </Button>
        )}
      </div>
    </div>
  );
}
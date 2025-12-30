import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Scan, Clipboard, Wand2, FolderTree, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

import LiveAppScanner from "./LiveAppScanner";
import ClipboardConfigParser from "./ClipboardConfigParser";
import StructureWizard from "./StructureWizard";
import StructureOverview from "./StructureOverview";

/**
 * UPSE – Universele Project Scan Engine Panel
 * Hoofdcomponent voor het scannen en beheren van project structuren
 * @param {Object} props
 * @param {Array} props.projects - Beschikbare Promptster projecten
 * @param {Object} props.currentStructure - Huidige ProjectStructure data
 * @param {Function} props.onStructureUpdate - Callback bij structure update
 * @param {string} props.selectedProjectId - Geselecteerd project ID
 * @param {Function} props.onProjectSelect - Callback bij project selectie
 */
export default function UPSEPanel({ 
  projects = [], 
  currentStructure,
  onStructureUpdate,
  selectedProjectId,
  onProjectSelect
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [llmParserInstruction, setLlmParserInstruction] = useState("");
  const [isSavingParser, setIsSavingParser] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Load LLM Parser instruction when project changes
  React.useEffect(() => {
    if (selectedProject?.llm_response_parser_instruction) {
      setLlmParserInstruction(selectedProject.llm_response_parser_instruction);
    } else {
      setLlmParserInstruction("");
    }
  }, [selectedProject]);

  /**
   * Voegt een nieuwe scan source toe aan de structure
   * @param {string} type - Type source (liveApp, clipboard, wizard)
   * @param {Object} data - Gescande data (pages, entities, etc.)
   * @param {Object} meta - Metadata over de scan
   */
  const handleScanComplete = async (type, data, meta = {}) => {
    const sourceId = `src_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newSource = {
      id: sourceId,
      type,
      created_at: new Date().toISOString(),
      meta
    };

    // Merge nieuwe data met bestaande structure
    const updatedStructure = {
      ...currentStructure,
      project_id: selectedProjectId,
      sources: [...(currentStructure?.sources || []), newSource],
      pages: mergeItems(currentStructure?.pages || [], data.pages || [], sourceId),
      entities: mergeItems(currentStructure?.entities || [], data.entities || [], sourceId),
      workflows: mergeItems(currentStructure?.workflows || [], data.workflows || [], sourceId),
      navigation: mergeItems(currentStructure?.navigation || [], data.navigation || [], sourceId),
      last_updated_at: new Date().toISOString()
    };

    if (data.platform_label && !currentStructure?.platform_label) {
      updatedStructure.platform_label = data.platform_label;
    }
    if (data.base_url && !currentStructure?.base_url) {
      updatedStructure.base_url = data.base_url;
    }

    onStructureUpdate(updatedStructure);
    setActiveTab("overview");
  };

  /**
   * Merged nieuwe items met bestaande, voorkomt duplicaten
   */
  const mergeItems = (existing, newItems, sourceId) => {
    const result = [...existing];
    
    newItems.forEach(item => {
      // Voeg source referentie toe
      const itemWithSource = {
        ...item,
        id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        from_sources: [...(item.from_sources || []), sourceId]
      };

      // Check of item al bestaat (op basis van naam of route)
      const existingIndex = result.findIndex(e => 
        (e.name && e.name === item.name) || 
        (e.route && e.route === item.route)
      );

      if (existingIndex >= 0) {
        // Update bestaand item, voeg source toe
        result[existingIndex] = {
          ...result[existingIndex],
          ...itemWithSource,
          from_sources: [...new Set([
            ...(result[existingIndex].from_sources || []),
            sourceId
          ])]
        };
      } else {
        result.push(itemWithSource);
      }
    });

    return result;
  };

  const handleSaveLLMParser = async () => {
    if (!selectedProjectId) {
      toast.error("Geen project geselecteerd");
      return;
    }

    setIsSavingParser(true);
    try {
      await base44.entities.Project.update(selectedProjectId, {
        llm_response_parser_instruction: llmParserInstruction
      });
      toast.success("LLM Response Parser opgeslagen");
      onProjectSelect(selectedProjectId); // Trigger refresh
    } catch (error) {
      toast.error("Kon parser niet opslaan");
      console.error(error);
    } finally {
      setIsSavingParser(false);
    }
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-indigo-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-purple-600" />
              UPSE – Project Structuur Scanner
            </CardTitle>
            <CardDescription>
              Scan en analyseer de structuur van je no-code projecten
            </CardDescription>
          </div>
          
          <Select value={selectedProjectId || ""} onValueChange={onProjectSelect}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecteer project..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-${project.color}-500`} />
                    {project.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {!selectedProjectId ? (
          <div className="text-center py-12 text-slate-500">
            <FolderTree className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Selecteer eerst een project om de structuur te scannen</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <FolderTree className="w-4 h-4" />
                Overzicht
              </TabsTrigger>
              <TabsTrigger value="parser" className="flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                LLM Parser
              </TabsTrigger>
              <TabsTrigger value="liveApp" className="flex items-center gap-2">
                <Scan className="w-4 h-4" />
                Live App
              </TabsTrigger>
              <TabsTrigger value="clipboard" className="flex items-center gap-2">
                <Clipboard className="w-4 h-4" />
                Clipboard
              </TabsTrigger>
              <TabsTrigger value="wizard" className="flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                Wizard
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <StructureOverview 
                structure={currentStructure}
                project={selectedProject}
                onRefresh={() => setActiveTab("liveApp")}
              />
            </TabsContent>

            <TabsContent value="parser">
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Project-specifieke LLM Response Parser</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Definieer hoe de LLM de output moet formatteren voor dit project. 
                    Dit wordt toegevoegd aan elke multiprompt voor {selectedProject?.name}.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Parser Instructie</Label>
                  <Textarea
                    value={llmParserInstruction}
                    onChange={(e) => setLlmParserInstruction(e.target.value)}
                    placeholder="Bijvoorbeeld: Return all changes as JSON with file paths and diffs..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500">
                    Deze instructie wordt automatisch toegevoegd aan elke multiprompt voor dit project.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setLlmParserInstruction("")}
                    disabled={!llmParserInstruction}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleSaveLLMParser}
                    disabled={isSavingParser}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isSavingParser ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" /> Save Parser</>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="liveApp">
              <LiveAppScanner
                baseUrl={currentStructure?.base_url || ""}
                existingPages={currentStructure?.pages || []}
                existingEntities={currentStructure?.entities || []}
                onCapture={(data, meta) => handleScanComplete("liveApp", data, meta)}
              />
            </TabsContent>

            <TabsContent value="clipboard">
              <ClipboardConfigParser
                onParse={(data, meta) => handleScanComplete("clipboard", data, meta)}
              />
            </TabsContent>

            <TabsContent value="wizard">
              <StructureWizard
                existingStructure={currentStructure}
                onComplete={(data, meta) => handleScanComplete("wizard", data, meta)}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
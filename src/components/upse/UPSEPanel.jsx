import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scan, Clipboard, Wand2, FolderTree, RefreshCw } from "lucide-react";

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

  const selectedProject = projects.find(p => p.id === selectedProjectId);

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
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <FolderTree className="w-4 h-4" />
                Overzicht
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
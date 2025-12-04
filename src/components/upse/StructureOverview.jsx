import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  FileText, 
  Database, 
  Workflow, 
  Navigation, 
  ChevronRight,
  ChevronDown,
  Copy,
  RefreshCw,
  Sparkles,
  Clock,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

/**
 * Structure Overview component
 * Toont een boomview van de ProjectStructure
 */
export default function StructureOverview({ structure, project, onRefresh }) {
  const [expandedSections, setExpandedSections] = useState({
    pages: true,
    entities: true,
    workflows: false,
    navigation: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  /**
   * Kopieert structuur als markdown voor gebruik in prompts
   */
  const copyAsMarkdown = () => {
    if (!structure) return;

    let markdown = `# Project Structuur: ${project?.name || "Onbekend"}\n\n`;
    markdown += `Platform: ${structure.platform_label || "Onbekend"}\n`;
    if (structure.base_url) markdown += `URL: ${structure.base_url}\n`;
    markdown += `\n---\n\n`;

    // Pages
    if (structure.pages?.length) {
      markdown += `## Pagina's\n\n`;
      structure.pages.forEach(page => {
        markdown += `### ${page.name}\n`;
        markdown += `- **Route:** ${page.route || "N/A"}\n`;
        markdown += `- **Type:** ${page.page_type || "other"}\n`;
        if (page.description) markdown += `- **Beschrijving:** ${page.description}\n`;
        if (page.entities?.length) markdown += `- **Entiteiten:** ${page.entities.join(", ")}\n`;
        if (page.components?.length) markdown += `- **Componenten:** ${page.components.join(", ")}\n`;
        markdown += `\n`;
      });
    }

    // Entities
    if (structure.entities?.length) {
      markdown += `## Entiteiten\n\n`;
      structure.entities.forEach(entity => {
        markdown += `### ${entity.name}\n`;
        if (entity.description) markdown += `${entity.description}\n\n`;
        if (entity.fields?.length) {
          markdown += `| Veld | Type | Verplicht |\n`;
          markdown += `|------|------|----------|\n`;
          entity.fields.forEach(field => {
            markdown += `| ${field.name} | ${field.type} | ${field.is_required ? "Ja" : "Nee"} |\n`;
          });
          markdown += `\n`;
        }
      });
    }

    // Workflows
    if (structure.workflows?.length) {
      markdown += `## Workflows\n\n`;
      structure.workflows.forEach(wf => {
        markdown += `### ${wf.name}\n`;
        if (wf.trigger_description) markdown += `**Trigger:** ${wf.trigger_description}\n`;
        if (wf.actions_description) markdown += `**Acties:** ${wf.actions_description}\n`;
        markdown += `\n`;
      });
    }

    navigator.clipboard.writeText(markdown);
    toast.success("Structuur gekopieerd als Markdown!");
  };

  /**
   * Kopieert als JSON voor component mapping
   */
  const copyAsComponentMapping = () => {
    if (!structure?.pages?.length) return;

    const mapping = {};
    structure.pages.forEach(page => {
      if (page.name && page.components?.length) {
        mapping[page.name] = page.components;
      }
    });

    navigator.clipboard.writeText(JSON.stringify(mapping, null, 2));
    toast.success("Component mapping gekopieerd!");
  };

  if (!structure || (!structure.pages?.length && !structure.entities?.length)) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-700 mb-2">Nog geen structuur</h3>
        <p className="text-slate-500 text-sm mb-4">
          Gebruik de Live App Scanner, Clipboard Config of Wizard om je project structuur te definiëren.
        </p>
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Start Scannen
        </Button>
      </div>
    );
  }

  const stats = {
    pages: structure.pages?.length || 0,
    entities: structure.entities?.length || 0,
    workflows: structure.workflows?.length || 0,
    navigation: structure.navigation?.length || 0,
    sources: structure.sources?.length || 0
  };

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge className="bg-purple-100 text-purple-700">
            {structure.platform_label || "Onbekend Platform"}
          </Badge>
          {structure.last_updated_at && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(structure.last_updated_at), "d MMM yyyy HH:mm", { locale: nl })}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyAsMarkdown}>
            <Copy className="w-3 h-3 mr-1" />
            Markdown
          </Button>
          <Button variant="outline" size="sm" onClick={copyAsComponentMapping}>
            <Sparkles className="w-3 h-3 mr-1" />
            Mapping
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.pages}</div>
            <div className="text-xs text-green-600">Pagina's</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.entities}</div>
            <div className="text-xs text-blue-600">Entiteiten</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-orange-700">{stats.workflows}</div>
            <div className="text-xs text-orange-600">Workflows</div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.sources}</div>
            <div className="text-xs text-purple-600">Bronnen</div>
          </CardContent>
        </Card>
      </div>

      {/* Tree View */}
      <div className="space-y-2">
        {/* Pages Section */}
        {structure.pages?.length > 0 && (
          <Collapsible open={expandedSections.pages} onOpenChange={() => toggleSection("pages")}>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:bg-slate-50 transition-colors">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {expandedSections.pages ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <FileText className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Pagina's</span>
                    <Badge variant="outline">{stats.pages}</Badge>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-6 mt-1 space-y-1">
                {structure.pages.map((page, index) => (
                  <div key={index} className="p-2 pl-4 border-l-2 border-green-200 bg-white rounded-r-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-medium text-sm">{page.name}</span>
                        <span className="text-xs text-slate-400 ml-2">{page.route}</span>
                        {page.page_type && (
                          <Badge variant="outline" className="ml-2 text-xs">{page.page_type}</Badge>
                        )}
                      </div>
                    </div>
                    {page.description && (
                      <p className="text-xs text-slate-500 mt-1">{page.description}</p>
                    )}
                    {(page.entities?.length > 0 || page.components?.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {page.entities?.map((e, i) => (
                          <Badge key={i} className="text-xs bg-blue-100 text-blue-700">{e}</Badge>
                        ))}
                        {page.components?.map((c, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Entities Section */}
        {structure.entities?.length > 0 && (
          <Collapsible open={expandedSections.entities} onOpenChange={() => toggleSection("entities")}>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:bg-slate-50 transition-colors">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {expandedSections.entities ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <Database className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Entiteiten</span>
                    <Badge variant="outline">{stats.entities}</Badge>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-6 mt-1 space-y-1">
                {structure.entities.map((entity, index) => (
                  <div key={index} className="p-2 pl-4 border-l-2 border-blue-200 bg-white rounded-r-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{entity.name}</span>
                      {entity.fields?.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {entity.fields.length} velden
                        </Badge>
                      )}
                    </div>
                    {entity.description && (
                      <p className="text-xs text-slate-500 mt-1">{entity.description}</p>
                    )}
                    {entity.fields?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entity.fields.slice(0, 5).map((field, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-mono">
                            {field.name}: {field.type}
                          </Badge>
                        ))}
                        {entity.fields.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{entity.fields.length - 5} meer
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Workflows Section */}
        {structure.workflows?.length > 0 && (
          <Collapsible open={expandedSections.workflows} onOpenChange={() => toggleSection("workflows")}>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:bg-slate-50 transition-colors">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {expandedSections.workflows ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <Workflow className="w-4 h-4 text-orange-600" />
                    <span className="font-medium">Workflows</span>
                    <Badge variant="outline">{stats.workflows}</Badge>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-6 mt-1 space-y-1">
                {structure.workflows.map((wf, index) => (
                  <div key={index} className="p-2 pl-4 border-l-2 border-orange-200 bg-white rounded-r-lg">
                    <span className="font-medium text-sm">{wf.name}</span>
                    {wf.trigger_description && (
                      <p className="text-xs text-slate-500 mt-1">
                        <strong>Trigger:</strong> {wf.trigger_description}
                      </p>
                    )}
                    {wf.actions_description && (
                      <p className="text-xs text-slate-500">
                        <strong>Acties:</strong> {wf.actions_description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Navigation Section */}
        {structure.navigation?.length > 0 && (
          <Collapsible open={expandedSections.navigation} onOpenChange={() => toggleSection("navigation")}>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:bg-slate-50 transition-colors">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {expandedSections.navigation ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <Navigation className="w-4 h-4 text-purple-600" />
                    <span className="font-medium">Navigatie</span>
                    <Badge variant="outline">{stats.navigation}</Badge>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-6 mt-1 space-y-1">
                {structure.navigation.map((nav, index) => (
                  <div key={index} className="p-2 pl-4 border-l-2 border-purple-200 bg-white rounded-r-lg flex items-center gap-2">
                    <span className="font-medium text-sm">{nav.label}</span>
                    <span className="text-xs text-slate-400">{nav.route}</span>
                    <Badge variant="outline" className="text-xs">{nav.position}</Badge>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
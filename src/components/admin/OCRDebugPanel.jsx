import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, Box, Layers, Network, Code } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * OCR Debug Panel - Admin Only
 * Shows Level 3 & Level 4 OCR analysis results
 * @param {Object} props
 * @param {string} props.screenshotUrl - URL of screenshot to analyze
 */
export default function OCRDebugPanel({ screenshotUrl }) {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showBboxes, setShowBboxes] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  /**
   * Trigger OCR analysis via backend function
   */
  const handleAnalyze = async () => {
    if (!screenshotUrl) {
      toast.error("No screenshot URL provided");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await base44.functions.invoke('analyzeScreenshotVision', { url: screenshotUrl });
      setAnalysisResult(response.data);
      toast.success(`Analysis complete: ${response.data.metadata.ocrLevel || 'basic'}`);
    } catch (error) {
      console.error('OCR analysis failed:', error);
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getLevelBadge = (level) => {
    const colors = {
      'level_4': 'bg-purple-500',
      'level_3': 'bg-blue-500',
      'level_2_5': 'bg-green-500',
      'level_2': 'bg-yellow-500',
      'basic': 'bg-slate-500'
    };
    return (
      <Badge className={`${colors[level] || 'bg-slate-500'} text-white`}>
        {level?.toUpperCase() || 'UNKNOWN'}
      </Badge>
    );
  };

  return (
    <Card className="bg-slate-50 dark:bg-slate-900 border-2 border-purple-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-500" />
            OCR Debug Panel (Admin)
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBboxes(!showBboxes)}
              className="text-xs"
            >
              {showBboxes ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
              BBoxes
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !screenshotUrl}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {analysisResult && (
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="level3">Level 3</TabsTrigger>
              <TabsTrigger value="level4">Level 4</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">OCR Level</p>
                  {getLevelBadge(analysisResult.metadata.ocrLevel)}
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Processing Time</p>
                  <p className="font-mono text-sm">{analysisResult.metadata.processingTime}ms</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Regions Detected</p>
                  <p className="font-mono text-sm">{analysisResult.regions?.length || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Image Size</p>
                  <p className="font-mono text-sm">{analysisResult.width}x{analysisResult.height}px</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                <p className="text-sm text-slate-500 mb-2">Summary</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{analysisResult.summary}</p>
              </div>

              {/* Preview with bounding boxes */}
              {showBboxes && (
                <div className="relative bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-sm text-slate-500 mb-2">Visual Preview</p>
                  <div className="relative inline-block">
                    <img src={screenshotUrl} alt="Screenshot" className="max-w-full h-auto rounded border" />
                    <svg 
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                      viewBox={`0 0 ${analysisResult.width} ${analysisResult.height}`}
                      style={{ width: '100%', height: 'auto' }}
                    >
                      {analysisResult.regions?.map((region, idx) => (
                        <rect
                          key={idx}
                          x={region.bbox.x}
                          y={region.bbox.y}
                          width={region.bbox.width}
                          height={region.bbox.height}
                          fill="none"
                          stroke={region.role === 'button' ? '#10b981' : region.role === 'input' ? '#3b82f6' : '#f59e0b'}
                          strokeWidth="2"
                          opacity="0.8"
                        />
                      ))}
                    </svg>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Level 3 Tab */}
            <TabsContent value="level3">
              <ScrollArea className="h-[500px]">
                {analysisResult.semanticBlocks ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <Layers className="w-4 h-4 text-blue-500" />
                      <h3 className="font-semibold">Semantic Blocks ({analysisResult.semanticBlocks.length})</h3>
                    </div>
                    {analysisResult.semanticBlocks.map((block) => (
                      <div key={block.id} className="bg-white dark:bg-slate-800 p-3 rounded border border-blue-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{block.type}</Badge>
                            <span className="text-xs text-slate-500">Level {block.hierarchy?.level || 0}</span>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">
                            {Math.round(block.confidence * 100)}%
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{block.text}</p>
                        <div className="text-xs text-slate-500 font-mono">
                          bbox: [{block.bbox.x}, {block.bbox.y}, {block.bbox.width}, {block.bbox.height}]
                        </div>
                        {block.relationships?.length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-slate-500 mb-1">Relationships:</p>
                            {block.relationships.map((rel, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs mr-1">
                                {rel.type} → {rel.targetId}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {analysisResult.layoutRelations && (
                      <div className="mt-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Network className="w-4 h-4 text-blue-500" />
                          <h3 className="font-semibold">Layout Relations ({analysisResult.layoutRelations.length})</h3>
                        </div>
                        <div className="space-y-2">
                          {analysisResult.layoutRelations.slice(0, 10).map((rel, idx) => (
                            <div key={idx} className="bg-slate-100 dark:bg-slate-700 p-2 rounded text-xs font-mono">
                              {rel.fromId} <span className="text-blue-500">{rel.relation}</span> {rel.toId}
                              <span className="text-slate-400 ml-2">(d: {Math.round(rel.distance)})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Level 3 data not available</p>
                    <p className="text-xs">Run analysis to generate semantic blocks</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Level 4 Tab */}
            <TabsContent value="level4">
              <ScrollArea className="h-[500px]">
                {analysisResult.visionStructure ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Box className="w-4 h-4 text-purple-500" />
                      <h3 className="font-semibold">
                        Detected Components ({analysisResult.visionStructure.metadata.componentCount})
                      </h3>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3 rounded">
                      <p className="text-xs text-slate-500 mb-2">Component Types:</p>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.visionStructure.metadata.detectedTypes.map((type, idx) => (
                          <Badge key={idx} className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {analysisResult.visionStructure.components.map((comp) => (
                      <div key={comp.id} className="bg-white dark:bg-slate-800 p-3 rounded border-l-4 border-purple-500">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Badge className="bg-purple-500 text-white text-xs mb-1">{comp.type}</Badge>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{comp.text || '(no text)'}</p>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">
                            {Math.round(comp.confidence * 100)}%
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 space-y-1">
                          <div className="font-mono">
                            bbox: [{comp.bbox.x}, {comp.bbox.y}, {comp.bbox.width}, {comp.bbox.height}]
                          </div>
                          {comp.attributes && Object.keys(comp.attributes).length > 0 && (
                            <div>
                              attributes: {JSON.stringify(comp.attributes, null, 0)}
                            </div>
                          )}
                          {comp.parent && <div>parent: {comp.parent}</div>}
                          {comp.children?.length > 0 && (
                            <div>children: [{comp.children.join(', ')}]</div>
                          )}
                        </div>
                      </div>
                    ))}

                    {analysisResult.visionStructure.layoutTree && (
                      <div className="mt-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Network className="w-4 h-4 text-purple-500" />
                          <h3 className="font-semibold">Layout Tree</h3>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded">
                          <pre className="text-xs font-mono overflow-auto">
                            {JSON.stringify(analysisResult.visionStructure.layoutTree, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Box className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Level 4 data not available</p>
                    <p className="text-xs">Run analysis to generate component structure</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Raw JSON Tab */}
            <TabsContent value="raw">
              <ScrollArea className="h-[500px]">
                <div className="bg-slate-900 p-4 rounded">
                  <pre className="text-xs text-green-400 font-mono overflow-auto">
                    {JSON.stringify(analysisResult, null, 2)}
                  </pre>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}

      {!analysisResult && !isAnalyzing && (
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="mb-2">No analysis results yet</p>
            <p className="text-xs">Click "Run Analysis" to start OCR debugging</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
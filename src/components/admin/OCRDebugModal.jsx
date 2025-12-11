import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, Box, Layers, Network, Code, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * OCR Debug Modal - Admin Only (moved from Panel to Modal for better UX)
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Close callback
 * @param {string} props.screenshotUrl - URL of screenshot to analyze
 */
export default function OCRDebugModal({ isOpen, onClose, screenshotUrl }) {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showBboxes, setShowBboxes] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const handleAnalyze = async () => {
    if (!screenshotUrl) {
      toast.error("No screenshot URL provided");
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('[OCRDebugModal] Calling analyzeScreenshotVision with:', {
        screenshotUrl,
        level: 'full'
      });

      const response = await base44.functions.invoke('analyzeScreenshotVision', { 
        screenshotUrl,
        level: 'full'
      });
      
      console.log('[OCRDebugModal] Received response:', response.data);
      
      const result = response.data;
      
      if (result.ok === false) {
        const errorMsg = result.error || 'Analysis failed without specific error';
        console.error('[OCRDebugModal] Analysis returned error:', errorMsg);
        toast.error(`Analysis failed: ${errorMsg}`);
        return;
      }
      
      setAnalysisResult(result);
      toast.success(`Analysis complete: ${result.metadata?.ocrLevel || 'basic'}`);
    } catch (error) {
      console.error('[OCRDebugModal] Exception during analysis:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      
      toast.error(`Analysis failed: ${errorMessage}`, {
        description: error.response?.status ? `HTTP ${error.response.status}` : undefined,
        duration: 8000
      });
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-slate-50 dark:bg-slate-900 border-2 border-purple-500">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-500" />
              OCR Debug Panel (Admin)
            </DialogTitle>
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
        </DialogHeader>

        {analysisResult && (
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="level3">Level 3</TabsTrigger>
                <TabsTrigger value="level4">Level 4</TabsTrigger>
                <TabsTrigger value="raw">Raw JSON</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                    <p className="text-sm text-slate-500 mb-1">OCR Level</p>
                    {getLevelBadge(analysisResult?.metadata?.ocrLevel || 'basic')}
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                    <p className="text-sm text-slate-500 mb-1">Processing Time</p>
                    <p className="font-mono text-sm">{analysisResult?.metadata?.processingTime || 0}ms</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                    <p className="text-sm text-slate-500 mb-1">Regions Detected</p>
                    <p className="font-mono text-sm">{analysisResult?.regions?.length || 0}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                    <p className="text-sm text-slate-500 mb-1">Image Size</p>
                    <p className="font-mono text-sm">{analysisResult?.width || 0}x{analysisResult?.height || 0}px</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-sm text-slate-500 mb-2">Summary</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{analysisResult?.summary || 'No summary available'}</p>
                </div>

                {showBboxes && (
                  <div className="relative bg-white dark:bg-slate-800 p-4 rounded-lg max-h-[400px] overflow-auto">
                    <p className="text-sm text-slate-500 mb-2">Visual Preview</p>
                    <div className="relative inline-block">
                      <img src={screenshotUrl} alt="Screenshot" className="max-w-full h-auto rounded border" />
                      <svg 
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        viewBox={`0 0 ${analysisResult?.width || 1920} ${analysisResult?.height || 1080}`}
                        style={{ width: '100%', height: 'auto' }}
                      >
                        {analysisResult?.regions?.map((region, idx) => (
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

              <TabsContent value="level3">
                <ScrollArea className="h-[500px]">
                  {analysisResult?.semanticBlocks && analysisResult.semanticBlocks.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-4">
                        <Layers className="w-4 h-4 text-blue-500" />
                        <h3 className="font-semibold">Semantic Blocks ({analysisResult?.semanticBlocks?.length || 0})</h3>
                      </div>
                      {analysisResult?.semanticBlocks?.map((block) => (
                        <div key={block.id} className="bg-white dark:bg-slate-800 p-3 rounded border border-blue-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{block.type}</Badge>
                              <span className="text-xs text-slate-500">Level {block.hierarchy?.level || 0}</span>
                            </div>
                            <span className="text-xs text-slate-400 font-mono">
                              {Math.round((block.confidence || 0) * 100)}%
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{block?.text || '(no text)'}</p>
                          {block?.bbox && (
                            <div className="text-xs text-slate-500 font-mono">
                              bbox: [{block.bbox.x}, {block.bbox.y}, {block.bbox.width}, {block.bbox.height}]
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Level 3 data not available</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="level4">
                <ScrollArea className="h-[500px]">
                  {analysisResult?.visionStructure ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Box className="w-4 h-4 text-purple-500" />
                        <h3 className="font-semibold">
                          Detected Components ({analysisResult?.visionStructure?.metadata?.componentCount || 0})
                        </h3>
                      </div>

                      <div className="bg-white dark:bg-slate-800 p-3 rounded">
                        <p className="text-xs text-slate-500 mb-2">Component Types:</p>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult?.visionStructure?.metadata?.detectedTypes?.map((type, idx) => (
                            <Badge key={idx} className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {analysisResult?.visionStructure?.components?.map((comp) => (
                        <div key={comp.id} className="bg-white dark:bg-slate-800 p-3 rounded border-l-4 border-purple-500">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <Badge className="bg-purple-500 text-white text-xs mb-1">{comp.type}</Badge>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{comp.text || '(no text)'}</p>
                            </div>
                            <span className="text-xs text-slate-400 font-mono">
                              {Math.round((comp.confidence || 0) * 100)}%
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 space-y-1">
                            <div className="font-mono">
                              bbox: [{comp.bbox.x}, {comp.bbox.y}, {comp.bbox.width}, {comp.bbox.height}]
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Box className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Level 4 data not available</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

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
          </div>
        )}

        {!analysisResult && !isAnalyzing && (
          <div className="text-center py-8 text-slate-500">
            <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="mb-2">No analysis results yet</p>
            <p className="text-xs">Click "Run Analysis" to start OCR debugging</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
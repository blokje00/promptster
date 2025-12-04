import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ExternalLink, 
  Camera, 
  Globe, 
  AlertTriangle, 
  Plus,
  X,
  Loader2,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const PAGE_TYPES = [
  { value: "dashboard", label: "Dashboard" },
  { value: "list", label: "Lijst / Overzicht" },
  { value: "detail", label: "Detail pagina" },
  { value: "form", label: "Formulier" },
  { value: "settings", label: "Instellingen" },
  { value: "other", label: "Anders" }
];

/**
 * Live App Scanner component
 * Scant een live app via iframe en laat gebruiker pagina's capturen
 */
export default function LiveAppScanner({ 
  baseUrl: initialBaseUrl = "",
  existingPages = [],
  existingEntities = [],
  onCapture 
}) {
  const iframeRef = useRef(null);
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [isLoaded, setIsLoaded] = useState(false);
  const [corsBlocked, setCorsBlocked] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Current page capture form
  const [currentUrl, setCurrentUrl] = useState("");
  const [pageName, setPageName] = useState("");
  const [pageType, setPageType] = useState("other");
  const [pageDescription, setPageDescription] = useState("");
  const [pageEntities, setPageEntities] = useState("");
  const [pageComponents, setPageComponents] = useState("");
  
  // Captured pages in this session
  const [capturedPages, setCapturedPages] = useState([]);

  /**
   * Opent de app in het iframe
   */
  const handleOpenApp = () => {
    if (!baseUrl) {
      toast.error("Voer eerst een URL in");
      return;
    }
    
    let url = baseUrl;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
      setBaseUrl(url);
    }
    
    setIsLoaded(false);
    setCorsBlocked(false);
    setCurrentUrl(url);
    
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
    
    // Fallback timeout - als iframe niet laadt binnen 10 seconden, toon CORS warning
    setTimeout(() => {
      if (!isLoaded) {
        setIsLoaded(true);
        setCorsBlocked(true);
      }
    }, 10000);
  };

  /**
   * Iframe load handler
   */
  const handleIframeLoad = () => {
    setIsLoaded(true);
    
    try {
      // Probeer DOM toegang (zal falen bij cross-origin)
      const iframeDoc = iframeRef.current?.contentDocument;
      if (iframeDoc) {
        const title = iframeDoc.title;
        const h1 = iframeDoc.querySelector("h1")?.textContent;
        
        setPageName(h1 || title || "");
        setCurrentUrl(iframeRef.current.src);
        setCorsBlocked(false);
      }
    } catch (e) {
      // Cross-origin blocked
      setCorsBlocked(true);
      setCurrentUrl(iframeRef.current?.src || baseUrl);
    }
  };

  /**
   * Extraheert route uit URL
   */
  const extractRoute = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.pathname + parsed.search;
    } catch {
      return url;
    }
  };

  /**
   * Genereert beschrijving met AI
   */
  const generateDescription = async () => {
    if (!pageName && !pageType) return;
    
    setIsCapturing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Genereer een korte, technische beschrijving (max 2 zinnen) voor een pagina met de volgende kenmerken:
        
- Pagina naam: ${pageName || "Onbekend"}
- Type: ${pageType}
- URL/Route: ${extractRoute(currentUrl)}
- Entiteiten: ${pageEntities || "Geen opgegeven"}
- Componenten: ${pageComponents || "Geen opgegeven"}

De beschrijving moet bruikbaar zijn als context voor een AI die code moet genereren. Focus op functionaliteit en datastromen.`,
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" }
          }
        }
      });
      
      setPageDescription(result.description);
    } catch (error) {
      console.error("AI description failed:", error);
      toast.error("Kon geen beschrijving genereren");
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * Capturt de huidige pagina
   */
  const handleCapturePage = () => {
    if (!pageName.trim()) {
      toast.error("Geef de pagina een naam");
      return;
    }

    const newPage = {
      id: `page_${Date.now()}`,
      name: pageName.trim(),
      route: extractRoute(currentUrl),
      url_example: currentUrl,
      description: pageDescription,
      page_type: pageType,
      components: pageComponents.split(",").map(c => c.trim()).filter(Boolean),
      entities: pageEntities.split(",").map(e => e.trim()).filter(Boolean)
    };

    setCapturedPages(prev => [...prev, newPage]);
    
    // Reset form
    setPageName("");
    setPageDescription("");
    setPageEntities("");
    setPageComponents("");
    
    toast.success(`"${newPage.name}" pagina gecaptured!`);
  };

  /**
   * Verwijdert een gecapturde pagina
   */
  const handleRemoveCaptured = (pageId) => {
    setCapturedPages(prev => prev.filter(p => p.id !== pageId));
  };

  /**
   * Slaat alle gecapturde pagina's op
   */
  const handleSaveAll = () => {
    if (capturedPages.length === 0) {
      toast.error("Capture eerst enkele pagina's");
      return;
    }

    onCapture(
      { 
        pages: capturedPages,
        base_url: baseUrl
      },
      { 
        scanned_url: baseUrl,
        pages_count: capturedPages.length,
        cors_blocked: corsBlocked
      }
    );

    setCapturedPages([]);
    toast.success(`${capturedPages.length} pagina's opgeslagen!`);
  };

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="https://mijn-app.com of preview URL..."
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleOpenApp()}
          />
        </div>
        <Button onClick={handleOpenApp} className="bg-purple-600 hover:bg-purple-700">
          <Globe className="w-4 h-4 mr-2" />
          Open App
        </Button>
        <Button 
          variant="outline" 
          onClick={() => window.open(baseUrl, "_blank")}
          title="Open in nieuw tabblad"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>

      {corsBlocked && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Cross-origin beperking:</strong> DOM-toegang is geblokkeerd. 
            Je kunt nog steeds pagina's capturen door handmatig de naam en beschrijving in te vullen.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Iframe Preview */}
        <Card className="overflow-hidden">
          <div className="bg-slate-100 border-b px-3 py-2 flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-slate-500 truncate flex-1">
              {currentUrl || "Geen app geladen"}
            </span>
          </div>
          <div className="h-[400px] bg-white relative">
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onLoad={handleIframeLoad}
              onError={() => {
                setIsLoaded(true);
                setCorsBlocked(true);
                setCurrentUrl(baseUrl);
              }}
              title="App Preview"
            />
            {!isLoaded && baseUrl && iframeRef.current?.src && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            )}
          </div>
        </Card>

        {/* Capture Form */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Pagina Details</h3>
                {isLoaded && (
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Geladen
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Pagina Naam</Label>
                  <Input
                    placeholder="Dashboard, Orders, etc."
                    value={pageName}
                    onChange={(e) => setPageName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={pageType} onValueChange={setPageType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Entiteiten op deze pagina (comma separated)</Label>
                <Input
                  placeholder="Order, Customer, Product..."
                  value={pageEntities}
                  onChange={(e) => setPageEntities(e.target.value)}
                />
                {existingEntities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {existingEntities.slice(0, 5).map(e => (
                      <Badge 
                        key={e.name} 
                        variant="outline" 
                        className="text-xs cursor-pointer hover:bg-slate-100"
                        onClick={() => setPageEntities(prev => prev ? `${prev}, ${e.name}` : e.name)}
                      >
                        + {e.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs">Componenten (comma separated)</Label>
                <Input
                  placeholder="OrderList, FilterBar, Chart..."
                  value={pageComponents}
                  onChange={(e) => setPageComponents(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Beschrijving</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={generateDescription}
                    disabled={isCapturing}
                    className="h-6 text-xs"
                  >
                    {isCapturing ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <span className="mr-1">✨</span>
                    )}
                    Genereer met AI
                  </Button>
                </div>
                <Textarea
                  placeholder="Korte beschrijving van de pagina functionaliteit..."
                  value={pageDescription}
                  onChange={(e) => setPageDescription(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <Button 
                onClick={handleCapturePage}
                disabled={!pageName.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture Pagina
              </Button>
            </CardContent>
          </Card>

          {/* Captured Pages */}
          {capturedPages.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800">
                    Gecaptured ({capturedPages.length})
                  </h3>
                  <Button 
                    size="sm" 
                    onClick={handleSaveAll}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Opslaan in Project
                  </Button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-auto">
                  {capturedPages.map(page => (
                    <div 
                      key={page.id}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <span className="font-medium text-sm">{page.name}</span>
                        <span className="text-xs text-slate-500 ml-2">{page.route}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{page.page_type}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCaptured(page.id)}
                          className="h-6 w-6 p-0 text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
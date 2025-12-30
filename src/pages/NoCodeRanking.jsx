import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, TrendingDown, Minus, RefreshCw, Star, AlertTriangle, 
  DollarSign, Users, Globe, Calendar, Shield, Zap, Info, Search,
  ArrowUp, ArrowDown, Bell, Target
} from "lucide-react";
import { toast } from "sonner";
import AccessGuard from "../components/auth/AccessGuard";

const statusIcons = {
  stable: <Minus className="w-4 h-4 text-slate-400" />,
  new: <Zap className="w-4 h-4 text-green-500" />,
  price_increase: <TrendingUp className="w-4 h-4 text-red-500" />,
  declining: <TrendingDown className="w-4 h-4 text-orange-500" />,
  shutdown: <AlertTriangle className="w-4 h-4 text-red-600" />
};

const statusLabels = {
  stable: "Stable",
  new: "New Platform",
  price_increase: "Price Increase",
  declining: "Declining",
  shutdown: "Shutdown"
};

const roiColors = {
  extreme: "bg-gradient-to-r from-green-500 to-emerald-600",
  moderate: "bg-gradient-to-r from-yellow-500 to-orange-500",
  minimal: "bg-gradient-to-r from-slate-400 to-slate-500"
};

const getRoiBadge = (score) => {
  if (score >= 8) return { label: "🔥 Extreme Advantage", class: roiColors.extreme };
  if (score >= 5) return { label: "⚠️ Moderate Advantage", class: roiColors.moderate };
  return { label: "❌ Minimal Advantage", class: roiColors.minimal };
};

function PlatformModal({ platform, onClose }) {
  if (!platform) return null;

  const roiBadge = getRoiBadge(platform.promptster_roi_score);

  return (
    <Dialog open={!!platform} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            {platform.name}
            <Badge className={roiBadge.class + " text-white"}>
              {roiBadge.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="w-5 h-5" /> Company & Ownership
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
              <div><strong>Founded:</strong> {platform.company_founded}</div>
              <div><strong>Country:</strong> {platform.company_country}</div>
              <div><strong>Founders:</strong> {platform.founders}</div>
              <div><strong>Funding:</strong> {platform.funding_total}</div>
            </CardContent>
          </Card>

          {/* Business Economics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="w-5 h-5" /> Business Economics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>Pricing Model:</strong> {platform.pricing_model}</div>
              <div><strong>Entry Price:</strong> €{platform.entry_price_eur}/month</div>
              <div><strong>Cost per 1K prompts:</strong> €{platform.cost_per_1000_prompts?.toFixed(2)}</div>
              <div><strong>Credits Included:</strong> {platform.included_credits || "N/A"}</div>
              <div><strong>Credit Burn Model:</strong> {platform.credit_burn_model}</div>
              <div className="pt-2">
                <strong>Lock-in Risk:</strong>{" "}
                <Badge variant={platform.lock_in_risk === 'high' ? 'destructive' : 'outline'}>
                  {platform.lock_in_risk}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Technical Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5" /> Technical Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>AI Providers:</strong> {platform.ai_providers?.join(", ") || "Unknown"}</div>
              <div><strong>Prompt Limits:</strong> {platform.prompt_limits || "Not specified"}</div>
              <div><strong>Context Handling:</strong> {platform.context_handling || "Standard"}</div>
              <div><strong>Hidden Costs:</strong> {platform.hidden_costs || "None detected"}</div>
            </CardContent>
          </Card>

          {/* Promptster Advantage */}
          <Card className="border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-indigo-700 dark:text-indigo-300">
                <Target className="w-5 h-5" /> Promptster ROI Advantage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong>ROI Score:</strong>{" "}
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {platform.promptster_roi_score}/10
                </span>
              </div>
              <div>
                <strong>Leverage Type:</strong> {platform.promptster_leverage}
              </div>
              <div>
                <strong>How Promptster Helps:</strong>
                <p className="mt-1 text-slate-700 dark:text-slate-300">{platform.promptster_advantage}</p>
              </div>
              
              {platform.cost_scenarios && platform.cost_scenarios.length > 0 && (
                <div className="mt-4">
                  <strong>Cost Scenarios:</strong>
                  {platform.cost_scenarios.map((scenario, i) => (
                    <div key={i} className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-lg">
                      <div className="font-medium">{scenario.scenario}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        <div>Without Promptster: {scenario.without_promptster}</div>
                        <div className="text-green-600 dark:text-green-400">With Promptster: {scenario.with_promptster}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div>Last updated: {new Date(platform.last_crawled).toLocaleString()}</div>
            <div>Data confidence: {platform.confidence_score}%</div>
            <div>Historical behavior: {platform.historical_behavior}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function NoCodeRanking() {
  const queryClient = useQueryClient();
  const [sortColumn, setSortColumn] = useState("rank");
  const [sortDirection, setSortDirection] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    }
  });

  const { data: platforms = [], isLoading } = useQuery({
    queryKey: ['noCodePlatforms'],
    queryFn: () => base44.entities.NoCodePlatform.list("rank"),
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['platformAlerts'],
    queryFn: () => base44.entities.PlatformAlert.list("-created_date"),
    select: (data) => data.slice(0, 10) // Latest 10 alerts
  });

  const updateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('updateNoCodeRanking', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noCodePlatforms'] });
      queryClient.invalidateQueries({ queryKey: ['platformAlerts'] });
      toast.success("Rankings updated successfully!");
    },
    onError: (error) => {
      toast.error("Update failed: " + error.message);
    }
  });

  const filteredPlatforms = useMemo(() => {
    let filtered = platforms;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.target_user_type?.toLowerCase().includes(query) ||
        p.ai_providers?.some(ai => ai.toLowerCase().includes(query))
      );
    }

    return [...filtered].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      const direction = sortDirection === "asc" ? 1 : -1;
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * direction;
      }
      return String(aVal).localeCompare(String(bVal)) * direction;
    });
  }, [platforms, searchQuery, sortColumn, sortDirection]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortHeader = ({ column, children }) => (
    <th 
      className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column && (
          sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        )}
      </div>
    </th>
  );

  // Market pulse calculations
  const avgRoiScore = platforms.length ? (platforms.reduce((sum, p) => sum + (p.promptster_roi_score || 0), 0) / platforms.length).toFixed(1) : 0;
  const recentPriceIncreases = alerts.filter(a => a.alert_type === 'price_increase').length;
  const newPlatforms = platforms.filter(p => p.status === 'new').length;

  return (
    <AccessGuard pageType="public">
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                No-Code Top 25 Ranking
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Live Market Intelligence • Self-Updating • Promptster ROI Analysis
              </p>
            </div>
            {currentUser?.role === 'admin' && (
              <Button 
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${updateMutation.isPending ? 'animate-spin' : ''}`} />
                Update Rankings
              </Button>
            )}
          </div>

          {/* Market Pulse */}
          <Card className="bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-indigo-500" /> Market Pulse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{platforms.length}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Platforms Tracked</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{avgRoiScore}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Avg ROI Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{recentPriceIncreases}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Price Increases (90d)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{newPlatforms}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">New Entrants</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Alerts */}
        {alerts.length > 0 && (
          <Card className="mb-6 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="w-5 h-5 text-orange-500" /> Recent Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-orange-50 dark:bg-orange-950 rounded-lg text-sm">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <div className="flex-1">
                      <span className="font-medium">{alert.description}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                        {new Date(alert.created_date).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge variant={alert.impact_level === 'high' ? 'destructive' : 'outline'}>
                      {alert.impact_level}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Filters */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search platforms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Rankings Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <SortHeader column="rank">Rank</SortHeader>
                  <SortHeader column="name">Platform</SortHeader>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <SortHeader column="target_user_type">Target Users</SortHeader>
                  <SortHeader column="entry_price_eur">Price (€/mo)</SortHeader>
                  <SortHeader column="cost_per_1000_prompts">€/1K Prompts</SortHeader>
                  <SortHeader column="transparency_score">Transparency</SortHeader>
                  <SortHeader column="promptster_roi_score">ROI Score ⭐</SortHeader>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Details</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="9" className="text-center py-8 text-slate-500">Loading rankings...</td></tr>
                ) : filteredPlatforms.length === 0 ? (
                  <tr><td colSpan="9" className="text-center py-8 text-slate-500">No platforms found</td></tr>
                ) : (
                  filteredPlatforms.map((platform) => {
                    const roiBadge = getRoiBadge(platform.promptster_roi_score);
                    return (
                      <tr 
                        key={platform.id}
                        className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        onClick={() => setSelectedPlatform(platform)}
                      >
                        <td className="px-4 py-3 text-lg font-bold text-indigo-600 dark:text-indigo-400">
                          #{platform.rank}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{platform.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {platform.ai_providers?.slice(0, 2).join(", ")}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {statusIcons[platform.status]}
                            <span className="text-xs">{statusLabels[platform.status]}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{platform.target_user_type}</td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          {platform.entry_price_eur > 0 ? `€${platform.entry_price_eur}` : "Free"}
                        </td>
                        <td className="px-4 py-3 text-sm">€{platform.cost_per_1000_prompts?.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-0.5">
                            {Array.from({length: 5}).map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3 h-3 ${i < platform.transparency_score ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={roiBadge.class + " text-white font-bold"}>
                            {platform.promptster_roi_score}/10
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm">
                            <Info className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ROI Formula Explainer */}
        <Card className="mt-8 border-indigo-200 dark:border-indigo-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" /> Promptster ROI Formula
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>The Promptster ROI Score (0-10) measures how much you can save by using Promptster for prompt storage, reuse, and optimization:</p>
            <ul className="space-y-2 ml-4 list-disc">
              <li><strong>Prompt Reuse (0-3 points):</strong> Platforms with expensive re-runs score higher</li>
              <li><strong>Retry Costs (0-3 points):</strong> Platforms charging per failed attempt score higher</li>
              <li><strong>Context Management (0-2 points):</strong> Platforms with costly context/history score higher</li>
              <li><strong>Credit Transparency (0-2 points):</strong> Opaque pricing models score higher (more arbitrage potential)</li>
            </ul>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg mt-4">
              <strong>Sweet Spot:</strong> Platforms scoring 8+ offer extreme savings potential through Promptster's workflow.
            </div>
          </CardContent>
        </Card>

        {/* Trust & Transparency */}
        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          <p>Last crawl: {platforms[0] ? new Date(platforms[0].last_crawled).toLocaleString() : 'Never'}</p>
          <p className="mt-1">Data confidence: AI-analyzed with manual verification • Updated {currentUser?.role === 'admin' ? 'on-demand' : 'regularly'}</p>
        </div>
      </div>

      {/* Platform Detail Modal */}
      {selectedPlatform && (
        <PlatformModal 
          platform={selectedPlatform}
          onClose={() => setSelectedPlatform(null)}
        />
      )}
    </div>
    </AccessGuard>
  );
}
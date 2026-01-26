import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, TrendingUp, AlertCircle, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LearnedPatternsPanel({ projectId }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const queryClient = useQueryClient();

    // Fetch learned patterns voor dit project
    const { data: patterns = [], isLoading } = useQuery({
        queryKey: ['learnedPatterns', projectId],
        queryFn: async () => {
            if (!projectId) return [];
            const allPatterns = await base44.entities.LearnedPattern.filter({ project_id: projectId });
            return allPatterns.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        },
        enabled: !!projectId
    });

    // Run preference synthesis
    const runSynthesisMutation = useMutation({
        mutationFn: async () => {
            const response = await base44.functions.invoke('synthesizePreferences', { project_id: projectId });
            return response.data;
        },
        onSuccess: (data) => {
            if (data.patterns_count > 0) {
                toast.success(`${data.patterns_count} nieuwe patterns geleerd! 🎯`);
                queryClient.invalidateQueries({ queryKey: ['learnedPatterns', projectId] });
            } else {
                toast.info(data.message || 'Nog niet genoeg data voor analyse');
            }
        },
        onError: (error) => {
            toast.error('Analyse mislukt: ' + error.message);
        }
    });

    // Run retrospective analysis
    const runRetrospectiveMutation = useMutation({
        mutationFn: async () => {
            const response = await base44.functions.invoke('analyzeRetrospectiveFeedback', { project_id: projectId });
            return response.data;
        },
        onSuccess: (data) => {
            if (data.patterns) {
                toast.success(`Retrospective analyse compleet! ${data.patterns.length} patterns gevonden 🔍`);
                queryClient.invalidateQueries({ queryKey: ['learnedPatterns', projectId] });
            } else {
                toast.info(data.message || 'Nog niet genoeg data voor retrospective analyse');
            }
        },
        onError: (error) => {
            toast.error('Retrospective analyse mislukt: ' + error.message);
        }
    });

    // Groepeer patterns per type
    const preferencePatterns = patterns.filter(p => p.pattern_type === 'preference_synthesis');
    const retrospectivePatterns = patterns.filter(p => p.pattern_type === 'retrospective');

    const getConfidenceColor = (confidence) => {
        switch (confidence) {
            case 'high': return 'bg-green-100 text-green-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-gray-100 text-gray-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getDomainColor = (domain) => {
        switch (domain) {
            case 'UI': return 'bg-blue-100 text-blue-800';
            case 'Data': return 'bg-purple-100 text-purple-800';
            case 'Logic': return 'bg-orange-100 text-orange-800';
            case 'All': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (!projectId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        AI Learning Patterns
                    </CardTitle>
                    <CardDescription>
                        Selecteer een project om learned patterns te zien
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-indigo-600" />
                            AI Learning Patterns
                            {patterns.length > 0 && (
                                <Badge variant="outline" className="ml-2">
                                    {patterns.length} patterns
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Training-Free GRPO: Leer van successen en failures
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runSynthesisMutation.mutate()}
                            disabled={runSynthesisMutation.isPending}
                        >
                            {runSynthesisMutation.isPending ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4" />
                            )}
                            <span className="ml-2">Synthesize</span>
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runRetrospectiveMutation.mutate()}
                            disabled={runRetrospectiveMutation.isPending}
                        >
                            {runRetrospectiveMutation.isPending ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <TrendingUp className="w-4 h-4" />
                            )}
                            <span className="ml-2">Retrospective</span>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-center py-8 text-gray-500">
                        Laden...
                    </div>
                ) : patterns.length === 0 ? (
                    <div className="text-center py-8">
                        <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">
                            Nog geen learned patterns voor dit project
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                            Gebruik de buttons hierboven om patterns te leren uit je feedback
                        </p>
                        <div className="text-xs text-gray-400 space-y-1">
                            <p>💡 Synthesize: 3+ excellent ratings nodig</p>
                            <p>📊 Retrospective: 10+ feedback samples nodig</p>
                        </div>
                    </div>
                ) : (
                    <Tabs defaultValue="preference">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="preference">
                                Preference Synthesis
                                {preferencePatterns.length > 0 && (
                                    <Badge variant="outline" className="ml-2">
                                        {preferencePatterns.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="retrospective">
                                Retrospective
                                {retrospectivePatterns.length > 0 && (
                                    <Badge variant="outline" className="ml-2">
                                        {retrospectivePatterns.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="preference" className="space-y-3 mt-4">
                            {preferencePatterns.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Geen preference synthesis patterns nog
                                </div>
                            ) : (
                                preferencePatterns.map(pattern => (
                                    <div
                                        key={pattern.id}
                                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                <Badge className={getDomainColor(pattern.domain)}>
                                                    {pattern.domain}
                                                </Badge>
                                                <Badge className={getConfidenceColor(pattern.confidence)}>
                                                    {pattern.confidence}
                                                </Badge>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {new Date(pattern.created_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="prose prose-sm max-w-none">
                                            <div className="whitespace-pre-wrap text-gray-700">
                                                {pattern.pattern_text}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                            <span>📊 Sample size: {pattern.sample_size}</span>
                                            {pattern.success_rate && (
                                                <span>✅ Success rate: {pattern.success_rate}%</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </TabsContent>

                        <TabsContent value="retrospective" className="space-y-3 mt-4">
                            {retrospectivePatterns.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Geen retrospective patterns nog
                                </div>
                            ) : (
                                retrospectivePatterns.map(pattern => {
                                    const isAntiPattern = pattern.pattern_text.includes('❌');
                                    return (
                                        <div
                                            key={pattern.id}
                                            className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                                                isAntiPattern ? 'border-red-200 bg-red-50/30' : 'border-green-200 bg-green-50/30'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {isAntiPattern ? (
                                                        <AlertCircle className="w-4 h-4 text-red-600" />
                                                    ) : (
                                                        <TrendingUp className="w-4 h-4 text-green-600" />
                                                    )}
                                                    <Badge className={getDomainColor(pattern.domain)}>
                                                        {pattern.domain}
                                                    </Badge>
                                                    <Badge className={getConfidenceColor(pattern.confidence)}>
                                                        {pattern.confidence}
                                                    </Badge>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(pattern.created_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="prose prose-sm max-w-none">
                                                <div className="whitespace-pre-wrap text-gray-700">
                                                    {pattern.pattern_text}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                                <span>📊 Sample size: {pattern.sample_size}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </CardContent>
        </Card>
    );
}
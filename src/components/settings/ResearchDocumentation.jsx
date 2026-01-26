import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, BookOpen, Sparkles, Download, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

const researchPapers = [
  {
    title: "Training-Free Group Robust Preference Optimization",
    arxivId: "2501.12963",
    url: "https://arxiv.org/abs/2501.12963",
    date: "January 2025",
    features: [
      {
        name: "Retrospective Strategy Learning",
        description: "Analyseert successen vs failures uit feedback en leert patterns zonder fine-tuning"
      },
      {
        name: "Smart Preference Synthesis",
        description: "Distilleert automatisch best practices uit excellent ratings (3+ feedbacks)"
      }
    ],
    implementation: "Backend functions: analyzeRetrospectiveFeedback, synthesizePreferences",
    color: "indigo"
  },
  {
    title: "Verbalized Sampling: Improving LLM Diversity",
    arxivId: "2510.01171",
    url: "https://arxiv.org/abs/2510.01171",
    date: "October 2024",
    features: [
      {
        name: "Verbalized Sampling",
        description: "Genereert diverse prompt varianten met typicality probabilities (+60-110% diversiteit)"
      }
    ],
    implementation: "Enabled via AI Settings toggle, gebruikt in handleGenerateVariants",
    color: "purple"
  },
  {
    title: "Agentic Reasoning: Transparent AI Decision-Making",
    arxivId: "2601.12538",
    url: "https://arxiv.org/abs/2601.12538",
    date: "January 2025",
    features: [
      {
        name: "AI Reasoning Transparency",
        description: "Toont planning, interpretatie en keuzes van de AI voor betere leesbaarheid"
      }
    ],
    implementation: "Enabled via AI Settings toggle, reasoning steps in usePromptGeneration",
    color: "green"
  },
  {
    title: "Task Decomposition for Complex Problems",
    arxivId: "research-based",
    url: "https://arxiv.org/search/?query=task+decomposition+llm",
    date: "2024",
    features: [
      {
        name: "Task Decomposition Optimizer",
        description: "Genereert 3 diverse task varianten (conservative, balanced, creative approaches)"
      }
    ],
    implementation: "Backend function: decomposeTask, UI: TaskDecomposerDialog in ThoughtCard",
    color: "amber"
  }
];

export default function ResearchDocumentation({ currentUser }) {
  const [downloadingPaper, setDownloadingPaper] = useState(null);

  // Check which papers are already downloaded
  const { data: downloadedPapers = {}, refetch } = useQuery({
    queryKey: ['downloadedPapers'],
    queryFn: async () => {
      const papers = {};
      for (const paper of researchPapers) {
        try {
          const result = await base44.functions.invoke('getResearchPaperUrl', {
            arxivId: paper.arxivId
          });
          if (result.data.success) {
            papers[paper.arxivId] = true;
          }
        } catch (error) {
          papers[paper.arxivId] = false;
        }
      }
      return papers;
    },
    enabled: Boolean(currentUser?.email)
  });

  const handleDownloadPaper = async (arxivId) => {
    setDownloadingPaper(arxivId);
    try {
      const result = await base44.functions.invoke('downloadResearchPaper', {
        arxivId
      });

      if (result.data.success) {
        toast.success(`Paper ${arxivId} downloaded to server`);
        refetch();
      } else {
        toast.error(result.data.error || 'Download failed');
      }
    } catch (error) {
      toast.error('Failed to download paper: ' + error.message);
    } finally {
      setDownloadingPaper(null);
    }
  };

  const handleOpenPaper = async (arxivId, fallbackUrl) => {
    try {
      const result = await base44.functions.invoke('getResearchPaperUrl', {
        arxivId
      });

      if (result.data.success) {
        window.open(result.data.signed_url, '_blank');
      } else {
        // Fallback to arXiv
        window.open(fallbackUrl, '_blank');
      }
    } catch (error) {
      window.open(fallbackUrl, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <CardTitle className="text-lg">Research Foundation</CardTitle>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Promptster's AI features zijn gebaseerd op cutting-edge research papers
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {researchPapers.map((paper, idx) => (
          <div 
            key={idx} 
            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3"
          >
            {/* Paper Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {paper.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>arXiv:{paper.arxivId}</span>
                  <span>•</span>
                  <span>{paper.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {downloadedPapers[paper.arxivId] && (
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenPaper(paper.arxivId, paper.url)}
                  className="h-7 text-xs"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {downloadedPapers[paper.arxivId] ? 'Open (Local)' : 'Open (arXiv)'}
                </Button>
                {currentUser?.role === 'admin' && !downloadedPapers[paper.arxivId] && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownloadPaper(paper.arxivId)}
                    disabled={downloadingPaper === paper.arxivId}
                    className="h-7 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    {downloadingPaper === paper.arxivId ? 'Downloading...' : 'Download'}
                  </Button>
                )}
              </div>
            </div>

            {/* Implemented Features */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className={`w-4 h-4 text-${paper.color}-600`} />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Geïmplementeerde Features:
                </span>
              </div>
              {paper.features.map((feature, fIdx) => (
                <div key={fIdx} className="ml-6 space-y-1">
                  <Badge 
                    variant="secondary" 
                    className={`bg-${paper.color}-100 dark:bg-${paper.color}-950/50 text-${paper.color}-700 dark:text-${paper.color}-300 border-${paper.color}-200 dark:border-${paper.color}-800`}
                  >
                    {feature.name}
                  </Badge>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Implementation Details */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold">Implementatie:</span> {paper.implementation}
              </p>
            </div>
          </div>
        ))}

        {/* Footer Note */}
        <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <p className="text-sm text-indigo-900 dark:text-indigo-200">
            <strong>Training-Free Approach:</strong> Alle features werken zonder model fine-tuning. 
            We gebruiken prompt engineering en feedback analysis om te leren van gebruikersinteracties.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
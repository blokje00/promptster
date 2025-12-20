import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PromptsterStory from "@/components/features/PromptsterStory.jsx";
import InlineEditableText from "@/components/features/InlineEditableText";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, Shield, Database, Code, Sparkles, ArrowRight, Edit, Eye } from "lucide-react";
import { createPageUrl } from "@/utils";
import AccessGuard from "../components/auth/AccessGuard";

// Default content fallbacks
const defaultContent = {
  hero_title: "Promptster Features",
  hero_subtitle: "Everything you need to accelerate your development workflow",
  
  feature_0_title: "Prompt Management",
  feature_0_description: "Central management of all your prompts with advanced tagging and search.",
  feature_0_spec_0: "Unlimited prompts",
  feature_0_spec_1: "Max. 50,000 characters per prompt",
  feature_0_spec_2: "Version control with history",
  feature_0_spec_3: "Tagging system",
  
  feature_1_title: "Multi-Task Builder",
  feature_1_description: "Build complex multi-step prompts by combining tasks with context.",
  feature_1_spec_0: "Max. 5 (Starter) / Unlimited (Pro)",
  feature_1_spec_1: "Drag-and-drop interface",
  feature_1_spec_2: "AI-powered optimization",
  feature_1_spec_3: "Project-specific templates",
  
  feature_2_title: "Code Snippets",
  feature_2_description: "Save and share reusable code snippets with syntax highlighting.",
  feature_2_spec_0: "Direct copy to clipboard",
  feature_2_spec_1: "Syntax highlighting",
  feature_2_spec_2: "Linked to projects",
  
  feature_3_title: "File Management",
  feature_3_description: "Secure storage of screenshots and zip files with your tasks.",
  feature_3_spec_0: "Max. 10MB per image",
  feature_3_spec_1: "Max. 50MB per zip file",
  feature_3_spec_2: "Automatic virus scan",
  feature_3_spec_3: "Secure URL generation",
};

const iconMap = {
  0: <Database className="w-6 h-6 text-indigo-500" />,
  1: <Zap className="w-6 h-6 text-yellow-500" />,
  2: <Code className="w-6 h-6 text-blue-500" />,
  3: <Shield className="w-6 h-6 text-green-500" />,
};

function FeaturesPage() {
  const [editMode, setEditMode] = useState(false);
  
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        return null;
      }
    },
    retry: false,
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ['featureContentBlocks'],
    queryFn: async () => {
      try {
        return await base44.entities.FeatureContentBlock.filter({ page: "features" });
      } catch (error) {
        console.warn('[Features] FeatureContentBlock fetch failed (non-blocking):', error.message);
        return [];
      }
    },
    retry: false,
  });

  const isAdmin = currentUser?.role === 'admin';

  // Resolve content: DB value or fallback
  const getContent = (key) => {
    const block = blocks.find(b => b.key === key);
    return block?.value || defaultContent[key] || "";
  };

  // Build feature cards from content
  const features = [0, 1, 2, 3].map(i => ({
    index: i,
    title: getContent(`feature_${i}_title`),
    description: getContent(`feature_${i}_description`),
    specs: [0, 1, 2, 3].map(j => getContent(`feature_${i}_spec_${j}`)).filter(Boolean),
    icon: iconMap[i]
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Admin Edit Toggle */}
      {isAdmin && (
        <div className="fixed top-20 right-4 z-50">
          <Button
            onClick={() => setEditMode(!editMode)}
            className={editMode ? "bg-green-600 hover:bg-green-700" : "bg-indigo-600 hover:bg-indigo-700"}
            size="sm"
          >
            {editMode ? <Eye className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
            {editMode ? "Done" : "Edit Page"}
          </Button>
        </div>
      )}

      {/* Get Started CTA - Top Banner */}
      {!currentUser && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-4 sticky top-0 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg">Start Your Free 14-Day Trial</h3>
                <p className="text-sm text-indigo-100">No credit card required. Cancel anytime.</p>
              </div>
            </div>
            <Button 
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                const nextRoute = params.get('next') || createPageUrl('Multiprompt');
                base44.auth.redirectToLogin(nextRoute);
              }}
              size="lg"
              className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold shadow-xl"
            >
              Start Prompting <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto p-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            <InlineEditableText
              blockKey="hero_title"
              value={getContent('hero_title')}
              isAdmin={isAdmin}
              editMode={editMode}
            />
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            <InlineEditableText
              blockKey="hero_subtitle"
              value={getContent('hero_subtitle')}
              isAdmin={isAdmin}
              editMode={editMode}
              multiline
            />
          </p>
        </div>

        {/* Story Section */}
        <PromptsterStory isAdmin={isAdmin} />

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card key={feature.index} className="hover:shadow-lg transition-shadow duration-300 border-t-4 border-t-indigo-500 relative group bg-white dark:bg-slate-800">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
                    <InlineEditableText
                      blockKey={`feature_${feature.index}_title`}
                      value={feature.title}
                      isAdmin={isAdmin}
                      editMode={editMode}
                    />
                  </CardTitle>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  <InlineEditableText
                    blockKey={`feature_${feature.index}_description`}
                    value={feature.description}
                    isAdmin={isAdmin}
                    editMode={editMode}
                    multiline
                  />
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {feature.specs.map((spec, i) => (
                    <li key={i} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 mr-2 shrink-0 mt-0.5" />
                      <InlineEditableText
                        blockKey={`feature_${feature.index}_spec_${i}`}
                        value={spec}
                        isAdmin={isAdmin}
                        editMode={editMode}
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Features() {
  return (
    <AccessGuard pageType="public">
      <FeaturesPage />
    </AccessGuard>
  );
}
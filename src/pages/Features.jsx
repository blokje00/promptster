import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUserSettings } from "@/components/hooks/useCurrentUserSettings";
import PromptsterStory from "@/components/features/PromptsterStory.jsx";
import InlineEditableText from "@/components/features/InlineEditableText";
import TierAdvisor from "@/components/subscription/TierAdvisor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, Shield, Database, Code, Sparkles, ArrowRight, Edit, Eye } from "lucide-react";
import { createPageUrl } from "@/utils";
import AccessGuard from "../components/auth/AccessGuard";

// Complete default content fallbacks for ALL text on Features page
const defaultContent = {
  // Hero section
  "features.hero.title": "Promptster Features",
  "features.hero.subtitle": "Everything you need to accelerate your development workflow",
  
  // CTA Banner
  "features.cta.banner.title": "Start Your Free 14-Day Trial",
  "features.cta.banner.subtitle": "No credit card required. Cancel anytime.",
  "features.cta.banner.button": "Start Prompting",
  
  // Feature cards (4 cards)
  "features.card.0.title": "Prompt Management",
  "features.card.0.description": "Central management of all your prompts with advanced tagging and search.",
  "features.card.0.spec.0": "Unlimited prompts",
  "features.card.0.spec.1": "Max. 50,000 characters per prompt",
  "features.card.0.spec.2": "Version control with history",
  "features.card.0.spec.3": "Tagging system",
  
  "features.card.1.title": "Multi-Task Builder",
  "features.card.1.description": "Build complex multi-step prompts by combining tasks with context.",
  "features.card.1.spec.0": "Max. 5 (Starter) / Unlimited (Pro)",
  "features.card.1.spec.1": "Drag-and-drop interface",
  "features.card.1.spec.2": "AI-powered optimization",
  "features.card.1.spec.3": "Project-specific templates",
  
  "features.card.2.title": "Code Snippets",
  "features.card.2.description": "Save and share reusable code snippets with syntax highlighting.",
  "features.card.2.spec.0": "Direct copy to clipboard",
  "features.card.2.spec.1": "Syntax highlighting",
  "features.card.2.spec.2": "Linked to projects",
  
  "features.card.3.title": "File Management",
  "features.card.3.description": "Secure storage of screenshots and zip files with your tasks.",
  "features.card.3.spec.0": "Max. 10MB per image",
  "features.card.3.spec.1": "Max. 50MB per zip file",
  "features.card.3.spec.2": "Automatic virus scan",
  "features.card.3.spec.3": "Secure URL generation",
};

const iconMap = {
  0: <Database className="w-6 h-6 text-indigo-500" />,
  1: <Zap className="w-6 h-6 text-yellow-500" />,
  2: <Code className="w-6 h-6 text-blue-500" />,
  3: <Shield className="w-6 h-6 text-green-500" />,
};

function FeaturesPage() {
  const [editMode, setEditMode] = useState(false);
  
  const { data: currentUser } = useCurrentUserSettings();

  // DEFINITIVE: Read directly from User entity
  const showTierAdvisor = currentUser?.tier_advisor_features_enabled === true;

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

  // Build resolved blocks map: DB values merged with defaults
  const resolvedBlocks = { ...defaultContent };
  blocks.forEach(block => {
    if (block.key) {
      resolvedBlocks[block.key] = block.value;
    }
  });

  // Helper to get content with fallback
  const getContent = (key) => resolvedBlocks[key] || defaultContent[key] || "";

  // Build feature cards from content
  const features = [0, 1, 2, 3].map(i => ({
    index: i,
    title: getContent(`features.card.${i}.title`),
    description: getContent(`features.card.${i}.description`),
    specs: [0, 1, 2, 3].map(j => getContent(`features.card.${i}.spec.${j}`)).filter(Boolean),
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
                <h3 className="font-bold text-lg">
                  <InlineEditableText
                    blockKey="features.cta.banner.title"
                    value={getContent('features.cta.banner.title')}
                    isAdmin={isAdmin}
                    editMode={editMode}
                  />
                </h3>
                <p className="text-sm text-indigo-100">
                  <InlineEditableText
                    blockKey="features.cta.banner.subtitle"
                    value={getContent('features.cta.banner.subtitle')}
                    isAdmin={isAdmin}
                    editMode={editMode}
                  />
                </p>
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
              <InlineEditableText
                blockKey="features.cta.banner.button"
                value={getContent('features.cta.banner.button')}
                isAdmin={isAdmin}
                editMode={editMode}
              />
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto p-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            <InlineEditableText
              blockKey="features.hero.title"
              value={getContent('features.hero.title')}
              isAdmin={isAdmin}
              editMode={editMode}
              as="span"
            />
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            <InlineEditableText
              blockKey="features.hero.subtitle"
              value={getContent('features.hero.subtitle')}
              isAdmin={isAdmin}
              editMode={editMode}
              multiline
              as="span"
            />
          </p>
        </div>

        {/* Tier Advisor - Admin or enabled for users */}
        {showTierAdvisor && (
          <div className="mb-12">
            <TierAdvisor />
          </div>
        )}

        {/* Story Section - Pass resolved blocks and edit state */}
        <PromptsterStory 
          isAdmin={isAdmin} 
          editMode={editMode}
          resolvedBlocks={resolvedBlocks}
        />

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
                      blockKey={`features.card.${feature.index}.title`}
                      value={feature.title}
                      isAdmin={isAdmin}
                      editMode={editMode}
                      as="span"
                    />
                  </CardTitle>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  <InlineEditableText
                    blockKey={`features.card.${feature.index}.description`}
                    value={feature.description}
                    isAdmin={isAdmin}
                    editMode={editMode}
                    multiline
                    as="span"
                  />
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {feature.specs.map((spec, i) => (
                    <li key={i} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 mr-2 shrink-0 mt-0.5" />
                      <InlineEditableText
                        blockKey={`features.card.${feature.index}.spec.${i}`}
                        value={spec}
                        isAdmin={isAdmin}
                        editMode={editMode}
                        as="span"
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
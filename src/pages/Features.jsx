import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PromptsterStory from "@/components/features/PromptsterStory.jsx";
import FeatureInlineEditor from "@/components/admin/FeatureInlineEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, Shield, Database, Code, Cpu, Sparkles, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AccessGuard from "../components/auth/AccessGuard";

const iconMap = {
  Database: <Database className="w-6 h-6 text-indigo-500" />,
  Zap: <Zap className="w-6 h-6 text-yellow-500" />,
  Code: <Code className="w-6 h-6 text-blue-500" />,
  Shield: <Shield className="w-6 h-6 text-green-500" />,
};

function FeaturesPage() {
  const navigate = useNavigate();
  
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
    queryKey: ['featureBlocks'],
    queryFn: () => base44.entities.FeatureBlock.list("order"),
  });

  const isAdmin = currentUser?.role === 'admin';

  const getBlockContent = (key, fallback = "") => {
    const block = blocks.find(b => b.block_key === key);
    return block?.content || fallback;
  };

  const getBlockMetadata = (key, fallback = {}) => {
    const block = blocks.find(b => b.block_key === key);
    return block?.metadata || fallback;
  };

  // Fallback features if no CMS data
  const features = blocks.filter(b => b.block_key.startsWith('feature_')).length > 0
    ? blocks.filter(b => b.block_key.startsWith('feature_')).map(block => ({
        title: block.content.split('\n')[0] || block.block_key,
        icon: iconMap[block.metadata?.icon] || <Database className="w-6 h-6 text-indigo-500" />,
        description: block.content.split('\n')[1] || "",
        specs: block.metadata?.specs || []
      }))
    : [
    {
      title: "Prompt Management",
      icon: <Database className="w-6 h-6 text-indigo-500" />,
      description: "Central management of all your prompts with advanced tagging and search.",
      specs: [
        "Unlimited prompts",
        "Max. 50,000 characters per prompt",
        "Version control with history",
        "Tagging system"
      ]
    },
    {
      title: "Multi-Task Builder",
      icon: <Zap className="w-6 h-6 text-yellow-500" />,
      description: "Build complex multi-step prompts by combining tasks with context.",
      specs: [
        "Max. 5 (Starter) / Unlimited (Pro)",
        "Drag-and-drop interface",
        "AI-powered optimization",
        "Project-specific templates"
      ]
    },
    {
      title: "Code Snippets",
      icon: <Code className="w-6 h-6 text-blue-500" />,
      description: "Save and share reusable code snippets with syntax highlighting.",
      specs: [
        "Direct copy to clipboard",
        "Syntax highlighting",
        "Linked to projects"
      ]
    },
    {
      title: "File Management",
      icon: <Shield className="w-6 h-6 text-green-500" />,
      description: "Secure storage of screenshots and zip files with your tasks.",
      specs: [
        "Max. 10MB per image",
        "Max. 50MB per zip file",
        "Automatic virus scan",
        "Secure URL generation"
      ]
    },

  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Get Started CTA - Top Banner */}
      {!currentUser && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-4 sticky top-0 z-50 shadow-lg">
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
                base44.auth.redirectToLogin(createPageUrl('Dashboard'));
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            {isAdmin ? (
              <FeatureInlineEditor 
                blockKey="hero_title" 
                currentContent={getBlockContent('hero_title', 'Promptster Features')}
              />
            ) : (
              getBlockContent('hero_title', 'Promptster Features')
            )}
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            {isAdmin ? (
              <FeatureInlineEditor 
                blockKey="hero_subtitle" 
                currentContent={getBlockContent('hero_subtitle', 'Everything you need to accelerate your development workflow')}
              />
            ) : (
              getBlockContent('hero_subtitle', 'Everything you need to accelerate your development workflow')
            )}
          </p>
        </div>

        <Link to={createPageUrl("Subscription")} className="block mb-16 group">
          <div className="bg-indigo-900 dark:bg-indigo-950 rounded-2xl p-8 text-center text-white group-hover:bg-indigo-800 dark:group-hover:bg-indigo-900 transition-colors cursor-pointer">
            <h2 className="text-2xl font-bold mb-4">
              {isAdmin ? (
                <FeatureInlineEditor 
                  blockKey="cta_title" 
                  currentContent={getBlockContent('cta_title', 'Ready to start?')}
                  className="text-white"
                />
              ) : (
                getBlockContent('cta_title', 'Ready to start?')
              )}
            </h2>
            <p className="mb-6 text-indigo-200 dark:text-indigo-300">
              {isAdmin ? (
                <FeatureInlineEditor 
                  blockKey="cta_subtitle" 
                  currentContent={getBlockContent('cta_subtitle', 'Try all features for free for 14 days.')}
                  className="text-indigo-200 dark:text-indigo-300"
                />
              ) : (
                getBlockContent('cta_subtitle', 'Try all features for free for 14 days.')
              )}
            </p>
            <div className="flex justify-center gap-4">
              <Badge variant="outline" className="text-white border-white px-4 py-1">
                {isAdmin ? (
                  <FeatureInlineEditor 
                    blockKey="badge_version" 
                    currentContent={getBlockContent('badge_version', 'v0.4')}
                    className="text-white"
                  />
                ) : (
                  getBlockContent('badge_version', 'v0.4')
                )}
              </Badge>
              <Badge variant="outline" className="text-white border-white px-4 py-1">
                {isAdmin ? (
                  <FeatureInlineEditor 
                    blockKey="badge_uptime" 
                    currentContent={getBlockContent('badge_uptime', 'Uptime 99.9%')}
                    className="text-white"
                  />
                ) : (
                  getBlockContent('badge_uptime', 'Uptime 99.9%')
                )}
              </Badge>
            </div>
          </div>
        </Link>

        <PromptsterStory isAdmin={isAdmin} />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300 border-t-4 border-t-indigo-500 relative group bg-white dark:bg-slate-800">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
                    {isAdmin ? (
                      <FeatureInlineEditor 
                        blockKey={`feature_${index}_title`}
                        currentContent={feature.title}
                      />
                    ) : (
                      feature.title
                    )}
                  </CardTitle>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm h-10">
                  {isAdmin ? (
                    <FeatureInlineEditor 
                      blockKey={`feature_${index}_description`}
                      currentContent={feature.description}
                    />
                  ) : (
                    feature.description
                  )}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {feature.specs.map((spec, i) => (
                    <li key={i} className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 mr-2 shrink-0" />
                      {isAdmin ? (
                        <FeatureInlineEditor 
                          blockKey={`feature_${index}_spec_${i}`}
                          currentContent={spec}
                        />
                      ) : (
                        spec
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Link to={createPageUrl("Subscription")} className="block mt-16 group">
          <div className="bg-indigo-900 dark:bg-indigo-950 rounded-2xl p-8 text-center text-white group-hover:bg-indigo-800 dark:group-hover:bg-indigo-900 transition-colors cursor-pointer">
            <h2 className="text-2xl font-bold mb-4">
              {isAdmin ? (
                <FeatureInlineEditor 
                  blockKey="cta_title" 
                  currentContent={getBlockContent('cta_title', 'Ready to start?')}
                  className="text-white"
                />
              ) : (
                getBlockContent('cta_title', 'Ready to start?')
              )}
            </h2>
            <p className="mb-6 text-indigo-200">
              {isAdmin ? (
                <FeatureInlineEditor 
                  blockKey="cta_subtitle" 
                  currentContent={getBlockContent('cta_subtitle', 'Try all features for free for 14 days.')}
                  className="text-indigo-200"
                />
              ) : (
                getBlockContent('cta_subtitle', 'Try all features for free for 14 days.')
              )}
            </p>
            <div className="flex justify-center gap-4">
              <Badge variant="outline" className="text-white border-white px-4 py-1">
                {isAdmin ? (
                  <FeatureInlineEditor 
                    blockKey="badge_version" 
                    currentContent={getBlockContent('badge_version', 'v0.4')}
                    className="text-white"
                  />
                ) : (
                  getBlockContent('badge_version', 'v0.4')
                )}
              </Badge>
              <Badge variant="outline" className="text-white border-white px-4 py-1">
                {isAdmin ? (
                  <FeatureInlineEditor 
                    blockKey="badge_uptime" 
                    currentContent={getBlockContent('badge_uptime', 'Uptime 99.9%')}
                    className="text-white"
                  />
                ) : (
                  getBlockContent('badge_uptime', 'Uptime 99.9%')
                )}
              </Badge>
            </div>
          </div>
        </Link>
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
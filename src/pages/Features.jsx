import React from "react";
import PromptsterStory from "@/components/features/PromptsterStory.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, Shield, Database, Code, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Features() {
  const features = [
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
    {
      title: "AI Integration",
      icon: <Cpu className="w-6 h-6 text-purple-500" />,
      description: "Smart assistance for writing and improving your prompts.",
      specs: [
        "Context-aware suggestions",
        "Automatic language improvement",
        "Structure analysis",
        "Token count estimation"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Promptster Features
          </h1>
          <p className="text-xl text-slate-600">
            Everything you need to accelerate your development workflow
          </p>
        </div>

        <Link to={createPageUrl("Subscription")} className="block mb-16 group">
          <div className="bg-indigo-900 rounded-2xl p-8 text-center text-white group-hover:bg-indigo-800 transition-colors cursor-pointer">
            <h2 className="text-2xl font-bold mb-4">Ready to start?</h2>
            <p className="mb-6 text-indigo-200">
              Try all features for free for 14 days.
            </p>
            <div className="flex justify-center gap-4">
              <Badge variant="outline" className="text-white border-white px-4 py-1">
                v0.4
              </Badge>
              <Badge variant="outline" className="text-white border-white px-4 py-1">
                Uptime 99.9%
              </Badge>
            </div>
          </div>
        </Link>

        <PromptsterStory />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300 border-t-4 border-t-indigo-500">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
                <p className="text-slate-600 text-sm h-10">{feature.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {feature.specs.map((spec, i) => (
                    <li key={i} className="flex items-center text-sm text-slate-700">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 shrink-0" />
                      {spec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Link to={createPageUrl("Subscription")} className="block mt-16 group">
          <div className="bg-indigo-900 rounded-2xl p-8 text-center text-white group-hover:bg-indigo-800 transition-colors cursor-pointer">
            <h2 className="text-2xl font-bold mb-4">Ready to start?</h2>
            <p className="mb-6 text-indigo-200">
              Try all features for free for 14 days.
            </p>
            <div className="flex justify-center gap-4">
              <Badge variant="outline" className="text-white border-white px-4 py-1">
                v0.4
              </Badge>
              <Badge variant="outline" className="text-white border-white px-4 py-1">
                Uptime 99.9%
              </Badge>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
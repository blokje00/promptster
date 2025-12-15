import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, ListChecks, FileText, Image } from "lucide-react";

/**
 * Demo Data Overview - Shows what demo data is seeded for new users
 */
export default function DemoDataOverview() {
  const demoData = {
    projects: [
      {
        name: "SaaS Web App Refactor",
        color: "blue",
        description: "Refactoring and improving a medium-sized SaaS web application",
        templates: [
          "UI Review Template (start)",
          "Code Refactor Template (start)",
          "Bug Analysis Template (eind)"
        ],
        tasks: [
          "Review the homepage layout and visual hierarchy",
          "Identify usability issues in the admin dashboard",
          "Analyze a reported issue in the signup flow",
          "Propose improvements to the settings page code structure",
          "Review mobile layout issues and responsiveness"
        ]
      },
      {
        name: "AI Prompt Engineering Playground",
        color: "purple",
        description: "Exploring prompt design, iteration, and evaluation for AI systems",
        templates: [
          "Prompt Critique Template (start)",
          "Prompt Rewrite Template (start)",
          "Output Evaluation Template (eind)"
        ],
        tasks: [
          "Rewrite a poorly defined AI prompt for clarity and precision",
          "Analyze differences between concise and verbose prompt styles",
          "Identify hidden assumptions in a prompt",
          "Score an AI response against clear evaluation criteria",
          "Design a system prompt for consistent AI behavior across sessions"
        ]
      }
    ],
    personalPreferences: {
      title: "Personal AI Preferences",
      sections: [
        "Tone & Style",
        "Reasoning Preferences",
        "Output Preferences"
      ]
    },
    aiSettings: {
      improve_prompt_instruction: "Improve the following prompt technically and linguistically...",
      model_preference: "default",
      enable_context_suggestions: true
    },
    screenshots: 10
  };

  return (
    <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
      <CardHeader>
        <CardTitle className="text-purple-900 dark:text-purple-100 flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Demo Data Contents
        </CardTitle>
        <CardDescription className="text-purple-700 dark:text-purple-300">
          What gets seeded for new users (version: v1_promptster_full_demo)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Projects */}
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            {demoData.projects.length} Projects
          </h3>
          <div className="space-y-4">
            {demoData.projects.map((project, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full bg-${project.color}-500`} />
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{project.name}</h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{project.description}</p>
                
                <div className="space-y-2">
                  <div>
                    <Badge variant="outline" className="text-xs mb-2">
                      <FileText className="w-3 h-3 mr-1" />
                      {project.templates.length} Templates
                    </Badge>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 ml-4 space-y-1">
                      {project.templates.map((t, i) => (
                        <li key={i}>• {t}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <Badge variant="outline" className="text-xs mb-2">
                      <ListChecks className="w-3 h-3 mr-1" />
                      {project.tasks.length} Tasks
                    </Badge>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 ml-4 space-y-1">
                      {project.tasks.map((t, i) => (
                        <li key={i}>• {t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Config */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center p-3 bg-white dark:bg-slate-900 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">10</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Total Tasks</div>
          </div>
          <div className="text-center p-3 bg-white dark:bg-slate-900 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">6</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Templates</div>
          </div>
          <div className="text-center p-3 bg-white dark:bg-slate-900 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              <Image className="w-6 h-6 mx-auto" />
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">10 Screenshots</div>
          </div>
          <div className="text-center p-3 bg-white dark:bg-slate-900 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">✓</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">AI Settings</div>
          </div>
        </div>

        {/* Tester Note */}
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-xs text-yellow-800 dark:text-yellow-300">
            <strong>Tester Mode:</strong> User <code>patrickz@sunshower.nl</code> receives fresh demo data on every login (all existing data cleared first).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
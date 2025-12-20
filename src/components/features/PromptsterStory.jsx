import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Cpu, Layers, TrendingUp, Target } from "lucide-react";
import InlineEditableText from "./InlineEditableText";

// Default content for PromptsterStory
const storyDefaults = {
  // Intro section
  "story.intro.badge": "A New Way of Building",
  "story.intro.title": "Building websites or webapps with AI is incredibly convenient… until it suddenly isn't.",
  "story.intro.p1": "The first step is easy: type or speak some text, and your app is (almost) there. That part is simple—and cheap!",
  "story.intro.p2": "But then the real work begins: dozens of small prompts that gradually nudge your no-code platform toward the final result. All the time and cost advantages from that \"easy first step\" evaporate again: time-consuming, frustrating, and burning through credits.",
  "story.intro.quote": "It's like trying to steer without a steering wheel, and then having to parallel-park… using your voice only?",
  
  // AI Vision section
  "story.vision.badge": "Industry-Standard Technology",
  "story.vision.title": "Based on GUI Element Detection & Vision-to-Code AI",
  "story.vision.description": "Promptster's AI engine understands your interface the way a developer does. Our technology analyzes screenshots with Semantic OCR and Vision-to-Code intelligence, so Promptster doesn't just read text — it truly comprehends UI structures, components and workflows.",
  "story.vision.recognizes.title": "What It Recognizes",
  "story.vision.recognizes.item.0": "Recognizes buttons, inputs, cards, modals, tabs and more",
  "story.vision.recognizes.item.1": "Understands context: label → input, title → content, parent → child",
  "story.vision.recognizes.item.2": "Automatically builds a visual UI structure used for better prompts",
  "story.vision.recognizes.item.3": "Ensures higher accuracy, fewer errors and faster multi-task output",
  "story.vision.result.title": "The Result",
  "story.vision.result.description": "AI that guesses less and understands more — making your workflow faster, smarter and more consistent.",
  
  // Solution section
  "story.solution.badge": "The Solution",
  "story.solution.title": "Introducing Promptster",
  "story.solution.description": "Collect all your small changes as Steps, and the app semi-automatically merges them into one powerful multi-step prompt.",
  "story.solution.builder.title": "Promptster Multi-Step Builder",
  "story.solution.builder.step1.title": "Context Is King",
  "story.solution.builder.step1.description": "For each Step, you can add context: which page, which project, screenshots, extra instructions, and more.",
  "story.solution.builder.step2.title": "Generate Multi-Prompt",
  "story.solution.builder.step2.description": "The final multi-prompt fully understands the context of your application.",
  "story.solution.benefit1.title": "Smarter & More Consistent",
  "story.solution.benefit1.description": "Because the workflow is semi-automated, your prompts become more structured and more reliable—without needing full automation.",
  "story.solution.benefit2.title": "No More Rejections",
  "story.solution.benefit2.description": "Complex instructions that are normally rejected by no-code platforms now succeed, because they are bundled into a single, well-structured flow.",
  
  // Problem section
  "story.problem.title": "The Invisible Cost Problem",
  "story.problem.p1": "No-code platforms like Base44.com, Make.com, or Zapier AI use completely different business models than AI providers.",
  "story.problem.p2": "The real cost comes from the hundreds of micro-prompts, flows, and actions you need after the first version of your app is built.",
  "story.problem.results.title": "The Result",
  "story.problem.results.item.0": "Up to 80% less cost and time loss",
  "story.problem.results.item.1": "Fewer runs, fewer correction rounds, less frustration",
  "story.problem.results.item.2": "A workflow that keeps improving itself",
  "story.problem.results.item.3": "Much better output",
  "story.problem.results.item.4": "Full control over your no-code project",
  
  // Workflow section
  "story.workflow.title": "Self-Learning Checklist Workflow",
  "story.workflow.description": "When your multi-prompt is ready, it automatically converts into a checklist workflow. Micro-prompts that do not yield the desired result are automatically fed back after reviewing, and re-processed.",
  "story.workflow.badge": "Your workflow gets smarter with every cycle",
  "story.workflow.quote": "\"Promptster changes how you use AI within no-code platforms—from chaotic loose commands to one tight, predictable and scalable process.\"",
};

export default function PromptsterStory({ isAdmin = false, editMode = false, resolvedBlocks = {} }) {
  // Merge resolved blocks with story defaults
  const allBlocks = { ...storyDefaults, ...resolvedBlocks };
  const getContent = (key) => allBlocks[key] || storyDefaults[key] || "";

  return (
    <div className="max-w-5xl mx-auto mb-20 space-y-16">
      {/* Intro Section */}
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <InlineEditableText
              blockKey="story.intro.badge"
              value={getContent('story.intro.badge')}
              isAdmin={isAdmin}
              editMode={editMode}
            />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 leading-tight">
            <InlineEditableText
              blockKey="story.intro.title"
              value={getContent('story.intro.title')}
              isAdmin={isAdmin}
              editMode={editMode}
              multiline
              as="span"
            />
          </h2>
          <div className="space-y-4 text-lg text-slate-600">
            <p>
              <InlineEditableText
                blockKey="story.intro.p1"
                value={getContent('story.intro.p1')}
                isAdmin={isAdmin}
                editMode={editMode}
                multiline
                as="span"
              />
            </p>
            <p>
              <InlineEditableText
                blockKey="story.intro.p2"
                value={getContent('story.intro.p2')}
                isAdmin={isAdmin}
                editMode={editMode}
                multiline
                as="span"
              />
            </p>
            <div className="p-4 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg italic text-orange-800">
              <InlineEditableText
                blockKey="story.intro.quote"
                value={getContent('story.intro.quote')}
                isAdmin={isAdmin}
                editMode={editMode}
                multiline
                as="span"
              />
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-20 blur-lg"></div>
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden min-h-[300px]">
          <img 
            src="https://base44.app/api/apps/68f4bcd57ca6479c7acf2f47/files/public/68f4bcd57ca6479c7acf2f47/d21581cf8_1765133423210_0hfsyj_Screenshot_2025_12_07_at_194740.png"
            alt="The Problem"
            className="w-full h-full object-cover"
          />
          </div>
        </div>
      </div>

      {/* Solution Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="mb-4 bg-green-100 text-green-700 hover:bg-green-100 border-green-200 px-3 py-1 text-sm">
            <InlineEditableText
              blockKey="story.solution.badge"
              value={getContent('story.solution.badge')}
              isAdmin={isAdmin}
              editMode={editMode}
            />
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            <InlineEditableText
              blockKey="story.solution.title"
              value={getContent('story.solution.title')}
              isAdmin={isAdmin}
              editMode={editMode}
              as="span"
            />
          </h2>
          <p className="text-lg text-slate-600">
            <InlineEditableText
              blockKey="story.solution.description"
              value={getContent('story.solution.description')}
              isAdmin={isAdmin}
              editMode={editMode}
              multiline
              as="span"
            />
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl opacity-20 blur-lg"></div>
            <div className="relative bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden min-h-[300px]">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f4bcd57ca6479c7acf2f47/a66e5dcb4_Screenshot2025-12-07at194740.png"
                alt="Promptster Multi-Step Builder"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <h3 className="text-2xl font-bold text-slate-900">
              <InlineEditableText
                blockKey="story.solution.builder.title"
                value={getContent('story.solution.builder.title')}
                isAdmin={isAdmin}
                editMode={editMode}
                as="span"
              />
            </h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="text-xs font-mono bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">01</span> 
                  <InlineEditableText
                    blockKey="story.solution.builder.step1.title"
                    value={getContent('story.solution.builder.step1.title')}
                    isAdmin={isAdmin}
                    editMode={editMode}
                    as="span"
                  />
                </h4>
                <p className="text-slate-600 mt-1">
                  <InlineEditableText
                    blockKey="story.solution.builder.step1.description"
                    value={getContent('story.solution.builder.step1.description')}
                    isAdmin={isAdmin}
                    editMode={editMode}
                    multiline
                    as="span"
                  />
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="text-xs font-mono bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">02</span>
                  <InlineEditableText
                    blockKey="story.solution.builder.step2.title"
                    value={getContent('story.solution.builder.step2.title')}
                    isAdmin={isAdmin}
                    editMode={editMode}
                    as="span"
                  />
                </h4>
                <p className="text-slate-600 mt-1">
                  <InlineEditableText
                    blockKey="story.solution.builder.step2.description"
                    value={getContent('story.solution.builder.step2.description')}
                    isAdmin={isAdmin}
                    editMode={editMode}
                    multiline
                    as="span"
                  />
                </p>
              </div>
            </div>

            <ul className="space-y-4 border-t border-slate-100 pt-4">
              <li className="flex gap-3">
                <div className="mt-1 bg-indigo-100 p-1 rounded text-indigo-600">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">
                    <InlineEditableText
                      blockKey="story.solution.benefit1.title"
                      value={getContent('story.solution.benefit1.title')}
                      isAdmin={isAdmin}
                      editMode={editMode}
                      as="span"
                    />
                  </h4>
                  <p className="text-sm text-slate-500">
                    <InlineEditableText
                      blockKey="story.solution.benefit1.description"
                      value={getContent('story.solution.benefit1.description')}
                      isAdmin={isAdmin}
                      editMode={editMode}
                      multiline
                      as="span"
                    />
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-1 bg-indigo-100 p-1 rounded text-indigo-600">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">
                    <InlineEditableText
                      blockKey="story.solution.benefit2.title"
                      value={getContent('story.solution.benefit2.title')}
                      isAdmin={isAdmin}
                      editMode={editMode}
                      as="span"
                    />
                  </h4>
                  <p className="text-sm text-slate-500">
                    <InlineEditableText
                      blockKey="story.solution.benefit2.description"
                      value={getContent('story.solution.benefit2.description')}
                      isAdmin={isAdmin}
                      editMode={editMode}
                      multiline
                      as="span"
                    />
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* AI Vision Technology Section */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 rounded-3xl p-8 md:p-12 shadow-sm border border-purple-200 dark:border-purple-800">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200 px-3 py-1 text-sm">
            <InlineEditableText
              blockKey="story.vision.badge"
              value={getContent('story.vision.badge')}
              isAdmin={isAdmin}
              editMode={editMode}
            />
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            <InlineEditableText
              blockKey="story.vision.title"
              value={getContent('story.vision.title')}
              isAdmin={isAdmin}
              editMode={editMode}
              multiline
              as="span"
            />
          </h2>
          <p className="text-lg text-slate-700 dark:text-slate-300 mb-4">
            <InlineEditableText
              blockKey="story.vision.description"
              value={getContent('story.vision.description')}
              isAdmin={isAdmin}
              editMode={editMode}
              multiline
              as="span"
            />
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-purple-200 dark:border-purple-800">
            <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              <InlineEditableText
                blockKey="story.vision.recognizes.title"
                value={getContent('story.vision.recognizes.title')}
                isAdmin={isAdmin}
                editMode={editMode}
                as="span"
              />
            </h3>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {[0, 1, 2, 3].map(i => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                  <InlineEditableText
                    blockKey={`story.vision.recognizes.item.${i}`}
                    value={getContent(`story.vision.recognizes.item.${i}`)}
                    isAdmin={isAdmin}
                    editMode={editMode}
                    multiline
                    as="span"
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-purple-200 dark:border-purple-800">
            <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              <InlineEditableText
                blockKey="story.vision.result.title"
                value={getContent('story.vision.result.title')}
                isAdmin={isAdmin}
                editMode={editMode}
                as="span"
              />
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-lg font-medium italic">
              <InlineEditableText
                blockKey="story.vision.result.description"
                value={getContent('story.vision.result.description')}
                isAdmin={isAdmin}
                editMode={editMode}
                multiline
                as="span"
              />
            </p>
          </div>
        </div>
      </div>

      {/* The Real Problem & Results */}
      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-slate-900">
            <InlineEditableText
              blockKey="story.problem.title"
              value={getContent('story.problem.title')}
              isAdmin={isAdmin}
              editMode={editMode}
              as="span"
            />
          </h3>
          <p className="text-slate-600">
            <InlineEditableText
              blockKey="story.problem.p1"
              value={getContent('story.problem.p1')}
              isAdmin={isAdmin}
              editMode={editMode}
              multiline
              as="span"
            />
          </p>
          <p className="text-slate-600">
            <span className="font-semibold text-slate-900 block mt-2">
              <InlineEditableText
                blockKey="story.problem.p2"
                value={getContent('story.problem.p2')}
                isAdmin={isAdmin}
                editMode={editMode}
                multiline
                as="span"
              />
            </span>
          </p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <InlineEditableText
              blockKey="story.problem.results.title"
              value={getContent('story.problem.results.title')}
              isAdmin={isAdmin}
              editMode={editMode}
              as="span"
            />
          </h3>
          <ul className="space-y-3">
            {[0, 1, 2, 3, 4].map(i => (
              <li key={i} className="flex items-start gap-3 text-slate-700">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <InlineEditableText
                  blockKey={`story.problem.results.item.${i}`}
                  value={getContent(`story.problem.results.item.${i}`)}
                  isAdmin={isAdmin}
                  editMode={editMode}
                  as="span"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Final Workflow Section */}
      <div className="relative bg-slate-900 rounded-3xl p-0 overflow-hidden text-white text-center md:text-left">
        <img 
          src="https://base44.app/api/apps/68f4bcd57ca6479c7acf2f47/files/public/68f4bcd57ca6479c7acf2f47/27e95fb3c_1764703710450_8sxj4k_Screenshot_2025_12_02_at_202629.png"
          alt="Workflow"
          className="w-full h-auto object-cover"
        />
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full opacity-20 blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full opacity-20 blur-3xl -ml-16 -mb-16"></div>
        
        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center p-8 md:p-12">
          <div className="space-y-6">
            <h3 className="text-2xl md:text-3xl font-bold">
              <InlineEditableText
                blockKey="story.workflow.title"
                value={getContent('story.workflow.title')}
                isAdmin={isAdmin}
                editMode={editMode}
                as="span"
              />
            </h3>
            <p className="text-indigo-100 leading-relaxed">
              <InlineEditableText
                blockKey="story.workflow.description"
                value={getContent('story.workflow.description')}
                isAdmin={isAdmin}
                editMode={editMode}
                multiline
                as="span"
              />
            </p>
            <div className="inline-flex items-center gap-2 text-green-400 font-medium bg-green-400/10 px-4 py-2 rounded-full">
              <ArrowRight className="w-4 h-4" />
              <InlineEditableText
                blockKey="story.workflow.badge"
                value={getContent('story.workflow.badge')}
                isAdmin={isAdmin}
                editMode={editMode}
                as="span"
              />
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 backdrop-blur-sm">
            <p className="text-lg font-medium text-indigo-200 italic mb-4">
              <InlineEditableText
                blockKey="story.workflow.quote"
                value={getContent('story.workflow.quote')}
                isAdmin={isAdmin}
                editMode={editMode}
                multiline
                as="span"
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
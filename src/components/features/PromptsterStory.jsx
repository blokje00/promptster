import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Cpu, Layers, TrendingUp, Target } from "lucide-react";
import FeatureInlineEditor from "@/components/admin/FeatureInlineEditor";

export default function PromptsterStory({ isAdmin = false }) {
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
            {isAdmin ? (
              <FeatureInlineEditor 
                blockKey="intro_badge"
                currentContent="A New Way of Building"
              />
            ) : (
              "A New Way of Building"
            )}
          </div>
          <h2 className="text-3xl font-bold text-slate-900 leading-tight">
            {isAdmin ? (
              <FeatureInlineEditor 
                blockKey="intro_title"
                currentContent="Building websites or webapps with AI is incredibly convenient… until it suddenly isn't."
              />
            ) : (
              <>Building websites or webapps with AI is incredibly convenient… <span className="text-slate-400">until it suddenly isn't.</span></>
            )}
          </h2>
          <div className="space-y-4 text-lg text-slate-600">
            <p>
              {isAdmin ? (
                <FeatureInlineEditor 
                  blockKey="intro_p1"
                  currentContent="The first step is easy: type or speak some text, and your app is (almost) there. That part is simple—and cheap!"
                />
              ) : (
                <>The first step is easy: type or speak some text, and your app is (almost) there. That part is simple—and cheap!</>
              )}
            </p>
            <p>
              {isAdmin ? (
                <FeatureInlineEditor 
                  blockKey="intro_p2"
                  currentContent="But then the real work begins: dozens of small prompts that gradually nudge your no-code platform toward the final result. All the time and cost advantages from that "easy first step" evaporate again: time-consuming, frustrating, and burning through credits."
                />
              ) : (
                <>But then the real work begins: dozens of small prompts that gradually nudge your no-code platform toward the final result. All the time and cost advantages from that "easy first step" evaporate again: time-consuming, frustrating, and burning through credits.</>
              )}
            </p>
            <div className="p-4 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg italic text-orange-800">
              {isAdmin ? (
                <FeatureInlineEditor 
                  blockKey="intro_quote"
                  currentContent=""It's like trying to steer without a steering wheel, and then having to parallel-park… using your voice only?""
                />
              ) : (
                ""It's like trying to steer without a steering wheel, and then having to parallel-park… using your voice only?""
              )}
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

      {/* AI Vision Technology Section */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 rounded-3xl p-8 md:p-12 shadow-sm border border-purple-200 dark:border-purple-800">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200 px-3 py-1 text-sm">
            {isAdmin ? (
              <FeatureInlineEditor 
                blockKey="ai_vision_badge"
                currentContent="Industry-Standard Technology"
              />
            ) : (
              "Industry-Standard Technology"
            )}
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            {isAdmin ? (
              <FeatureInlineEditor 
                blockKey="ai_vision_title"
                currentContent="Based on GUI Element Detection & Vision-to-Code AI"
              />
            ) : (
              "Based on GUI Element Detection & Vision-to-Code AI"
            )}
          </h2>
          <p className="text-lg text-slate-700 dark:text-slate-300 mb-4">
            {isAdmin ? (
              <FeatureInlineEditor 
                blockKey="ai_vision_desc_1"
                currentContent="Promptster's AI engine understands your interface the way a developer does. Our technology analyzes screenshots with Semantic OCR and Vision-to-Code intelligence, so Promptster doesn't just read text — it truly comprehends UI structures, components and workflows."
              />
            ) : (
              "Promptster's AI engine understands your interface the way a developer does. Our technology analyzes screenshots with Semantic OCR and Vision-to-Code intelligence, so Promptster doesn't just read text — it truly comprehends UI structures, components and workflows."
            )}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-purple-200 dark:border-purple-800">
            <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              {isAdmin ? (
                <FeatureInlineEditor 
                  blockKey="ai_vision_what_it_recognizes"
                  currentContent="What It Recognizes"
                />
              ) : (
                "What It Recognizes"
              )}
            </h3>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                <span>
                  {isAdmin ? (
                    <FeatureInlineEditor 
                      blockKey="ai_vision_rec_1"
                      currentContent="Recognizes buttons, inputs, cards, modals, tabs and more"
                    />
                  ) : (
                    "Recognizes buttons, inputs, cards, modals, tabs and more"
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                <span>
                  {isAdmin ? (
                    <FeatureInlineEditor 
                      blockKey="ai_vision_rec_2"
                      currentContent="Understands context: label → input, title → content, parent → child"
                    />
                  ) : (
                    "Understands context: label → input, title → content, parent → child"
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                <span>
                  {isAdmin ? (
                    <FeatureInlineEditor 
                      blockKey="ai_vision_rec_3"
                      currentContent="Automatically builds a visual UI structure used for better prompts"
                    />
                  ) : (
                    "Automatically builds a visual UI structure used for better prompts"
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                <span>
                  {isAdmin ? (
                    <FeatureInlineEditor 
                      blockKey="ai_vision_rec_4"
                      currentContent="Ensures higher accuracy, fewer errors and faster multi-task output"
                    />
                  ) : (
                    "Ensures higher accuracy, fewer errors and faster multi-task output"
                  )}
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-purple-200 dark:border-purple-800">
            <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              {isAdmin ? (
                <FeatureInlineEditor 
                  blockKey="ai_vision_result_title"
                  currentContent="The Result"
                />
              ) : (
                "The Result"
              )}
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-lg font-medium italic">
              {isAdmin ? (
                <FeatureInlineEditor 
                  blockKey="ai_vision_result_desc"
                  currentContent="AI that guesses less and understands more — making your workflow faster, smarter and more consistent."
                />
              ) : (
                "AI that guesses less and understands more — making your workflow faster, smarter and more consistent."
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Solution Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="mb-4 bg-green-100 text-green-700 hover:bg-green-100 border-green-200 px-3 py-1 text-sm">
            The Solution
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            {isAdmin ? (
              <FeatureInlineEditor 
                blockKey="story_solution_title"
                currentContent="Introducing Promptster"
              />
            ) : (
              <>Introducing <span className="text-indigo-600">Promptster</span></>
            )}
          </h2>
          <p className="text-lg text-slate-600">
            {isAdmin ? (
              <FeatureInlineEditor 
                blockKey="story_solution_desc"
                currentContent="Collect all your small changes as Steps, and the app semi-automatically merges them into one powerful multi-step prompt."
              />
            ) : (
              <>Collect all your small changes as <strong>Steps</strong>, and the app semi-automatically merges them into one powerful multi-step prompt.</>
            )}
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
              {isAdmin ? (
                <FeatureInlineEditor 
                  blockKey="story_builder_title"
                  currentContent="Promptster Multi-Step Builder"
                />
              ) : (
                "Promptster Multi-Step Builder"
              )}
            </h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="text-xs font-mono bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">01</span> 
                  {isAdmin ? (
                    <FeatureInlineEditor 
                      blockKey="story_builder_step1_title"
                      currentContent="Context Is King"
                    />
                  ) : (
                    "Context Is King"
                  )}
                </h4>
                <p className="text-slate-600 mt-1">
                  {isAdmin ? (
                    <FeatureInlineEditor 
                      blockKey="story_builder_step1_desc"
                      currentContent="For each Step, you can add context: which page, which project, screenshots, extra instructions, and more."
                    />
                  ) : (
                    "For each Step, you can add context: which page, which project, screenshots, extra instructions, and more."
                  )}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="text-xs font-mono bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">02</span>
                  {isAdmin ? (
                    <FeatureInlineEditor 
                      blockKey="story_builder_step2_title"
                      currentContent="Generate Multi-Prompt"
                    />
                  ) : (
                    "Generate Multi-Prompt"
                  )}
                </h4>
                <p className="text-slate-600 mt-1">
                  {isAdmin ? (
                    <FeatureInlineEditor 
                      blockKey="story_builder_step2_desc"
                      currentContent="The final multi-prompt fully understands the context of your application."
                    />
                  ) : (
                    "The final multi-prompt fully understands the context of your application."
                  )}
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
                    {isAdmin ? (
                      <FeatureInlineEditor 
                        blockKey="story_benefit1_title"
                        currentContent="Smarter & More Consistent"
                      />
                    ) : (
                      "Smarter & More Consistent"
                    )}
                  </h4>
                  <p className="text-sm text-slate-500">
                    {isAdmin ? (
                      <FeatureInlineEditor 
                        blockKey="story_benefit1_desc"
                        currentContent="Because the workflow is semi-automated, your prompts become more structured and more reliable—without needing full automation."
                      />
                    ) : (
                      "Because the workflow is semi-automated, your prompts become more structured and more reliable—without needing full automation."
                    )}
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-1 bg-indigo-100 p-1 rounded text-indigo-600">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">
                    {isAdmin ? (
                      <FeatureInlineEditor 
                        blockKey="story_benefit2_title"
                        currentContent="No More Rejections"
                      />
                    ) : (
                      "No More Rejections"
                    )}
                  </h4>
                  <p className="text-sm text-slate-500">
                    {isAdmin ? (
                      <FeatureInlineEditor 
                        blockKey="story_benefit2_desc"
                        currentContent="Complex instructions that are normally rejected by no-code platforms now succeed, because they are bundled into a single, well-structured flow."
                      />
                    ) : (
                      "Complex instructions that are normally rejected by no-code platforms now succeed, because they are bundled into a single, well-structured flow."
                    )}
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* The Real Problem & Results */}
      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-slate-900">
            {isAdmin ? (
              <FeatureInlineEditor 
                blockKey="story_problem_title"
                currentContent="The Invisible Cost Problem"
              />
            ) : (
              "The Invisible Cost Problem"
            )}
          </h3>
          <p className="text-slate-600">
            {isAdmin ? (
              <FeatureInlineEditor 
                blockKey="story_problem_p1"
                currentContent="No-code platforms like Base44.com, Make.com, or Zapier AI use completely different business models than AI providers."
              />
            ) : (
              "No-code platforms like Base44.com, Make.com, or Zapier AI use completely different business models than AI providers."
            )}
          </p>
          <p className="text-slate-600">
            <span className="font-semibold text-slate-900 block mt-2">
              {isAdmin ? (
                <FeatureInlineEditor 
                  blockKey="story_problem_p2"
                  currentContent="The real cost comes from the hundreds of micro-prompts, flows, and actions you need after the first version of your app is built."
                />
              ) : (
                "The real cost comes from the hundreds of micro-prompts, flows, and actions you need after the first version of your app is built."
              )}
            </span>
          </p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            The Result
          </h3>
          <ul className="space-y-3">
            {[
              "Up to 80% less cost and time loss",
              "Fewer runs, fewer correction rounds, less frustration",
              "A workflow that keeps improving itself",
              "Much better output",
              "Full control over your no-code project"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-700">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <span>
                  {isAdmin ? (
                    <FeatureInlineEditor 
                      blockKey={`story_result_${i}`}
                      currentContent={item}
                    />
                  ) : (
                    item
                  )}
                </span>
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
            <h3 className="text-2xl md:text-3xl font-bold">Self-Learning Checklist Workflow</h3>
            <p className="text-indigo-100 leading-relaxed">
              When your multi-prompt is ready, it automatically converts into a checklist workflow. 
              Micro-prompts that do not yield the desired result are automatically fed back after reviewing, and re-processed.
            </p>
            <div className="inline-flex items-center gap-2 text-green-400 font-medium bg-green-400/10 px-4 py-2 rounded-full">
              <ArrowRight className="w-4 h-4" />
              Your workflow gets smarter with every cycle
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 backdrop-blur-sm">
            <p className="text-lg font-medium text-indigo-200 italic mb-4">
              "Promptster changes how you use AI within no-code platforms—from chaotic loose commands to one tight, predictable and scalable process."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
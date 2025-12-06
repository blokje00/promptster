import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Cpu, Layers, TrendingUp, Target } from "lucide-react";

export default function PromptsterStory() {
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
            A New Way of Building
          </div>
          <h2 className="text-3xl font-bold text-slate-900 leading-tight">
            Building websites or webapps with AI is incredibly convenient… <span className="text-slate-400">until it suddenly isn’t.</span>
          </h2>
          <div className="space-y-4 text-lg text-slate-600">
            <p>
              The first step is easy: type or speak some text, and your app is (almost) there. 
              That part is simple—and cheap!
            </p>
            <p>
              But then the real work begins: dozens of small prompts that gradually nudge your no-code platform 
              toward the final result. All the time and cost advantages from that “easy first step” evaporate again: 
              time-consuming, frustrating, and burning through credits.
            </p>
            <div className="p-4 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg italic text-orange-800">
              “It’s like trying to steer without a navigation system, without a steering wheel, and then having to parallel-park… using only your voice?”
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-20 blur-lg"></div>
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden min-h-[300px]">
            <img 
              src="https://base44.app/api/apps/68f4bcd57ca6479c7acf2f47/files/public/68f4bcd57ca6479c7acf2f47/1ce69fe2e_Screenshot2025-12-02at125732.png"
              alt="Het probleem"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Solution Section */}
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="mb-4 bg-green-100 text-green-700 hover:bg-green-100 border-green-200 px-3 py-1 text-sm">
            The Solution
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            Introducing <span className="text-indigo-600">Promptster</span>
          </h2>
          <p className="text-lg text-slate-600">
            Collect all your small changes as <strong>Steps</strong>, and the app semi-automatically merges them into one powerful multi-step prompt.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 relative group">
            <div className="absolute -inset-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-800">
              {/* Mockup UI of Multi-Step Builder */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                </div>
                <div className="ml-4 text-xs text-slate-500 font-mono">Promptster Multi-Step Builder</div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono text-xs">01</div>
                  <div className="flex-1 space-y-2">
                    <div className="h-2 w-24 bg-slate-800 rounded"></div>
                    <div className="h-16 bg-slate-800/50 rounded border border-slate-800 p-3">
                      <div className="flex gap-2 mb-2">
                        <span className="h-1.5 w-12 bg-blue-500/30 rounded-full"></span>
                        <span className="h-1.5 w-16 bg-purple-500/30 rounded-full"></span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-700/30 rounded mb-1"></div>
                      <div className="h-1.5 w-2/3 bg-slate-700/30 rounded"></div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono text-xs">02</div>
                  <div className="flex-1 space-y-2">
                    <div className="h-2 w-32 bg-slate-800 rounded"></div>
                    <div className="h-16 bg-slate-800/50 rounded border border-slate-800 p-3">
                      <div className="flex gap-2 mb-2">
                        <span className="h-1.5 w-20 bg-orange-500/30 rounded-full"></span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-700/30 rounded mb-1"></div>
                      <div className="h-1.5 w-3/4 bg-slate-700/30 rounded"></div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                  <div className="h-2 w-20 bg-slate-800 rounded"></div>
                  <div className="px-3 py-1 bg-indigo-600 rounded text-[10px] text-white font-medium">Generate Multi-Prompt</div>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <h3 className="text-2xl font-bold text-slate-900">Promptster Multi-Step Builder</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="text-xs font-mono bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">01</span> 
                  Context Is King
                </h4>
                <p className="text-slate-600 mt-1">
                  For each Step, you can add context: which page, which project, screenshots, extra instructions, and more.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="text-xs font-mono bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">02</span>
                  Generate Multi-Prompt
                </h4>
                <p className="text-slate-600 mt-1">
                  The final multi-prompt fully understands the context of your application.
                </p>
              </div>
            </div>

            <ul className="space-y-4 border-t border-slate-100 pt-4">
              <li className="flex gap-3">
                <div className="mt-1 bg-indigo-100 p-1 rounded text-indigo-600">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Smarter & More Consistent</h4>
                  <p className="text-sm text-slate-500">Because the workflow is semi-automated, your prompts become more structured and more reliable—without needing full automation.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-1 bg-indigo-100 p-1 rounded text-indigo-600">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">No More Rejections</h4>
                  <p className="text-sm text-slate-500">Complex instructions that are normally rejected by no-code platforms now succeed, because they are bundled into a single, well-structured flow.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* The Real Problem & Results */}
      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-slate-900">The Invisible Cost Problem</h3>
          <p className="text-slate-600">
            No-code platforms like Base44.com, Make.com, or Zapier AI use completely different business models than AI providers.
          </p>
          <p className="text-slate-600">
            Promptster does not operate at the provider level and does not calculate token prices—because tokens are not the issue. 
            <span className="font-semibold text-slate-900 block mt-2">
              The real cost comes from the hundreds of micro-prompts, flows, and actions you need after the first version of your app is built.
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
                <span>{item}</span>
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
              When your multi-prompt is ready, you can automatically convert it into a checklist workflow. 
              Micro-prompts that do not yield the desired result are automatically fed back, 
              refined by AI, and re-processed.
            </p>
            <div className="inline-flex items-center gap-2 text-green-400 font-medium bg-green-400/10 px-4 py-2 rounded-full">
              <ArrowRight className="w-4 h-4" />
              Your workflow gets smarter with every cycle
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 backdrop-blur-sm">
            <p className="text-lg font-medium text-indigo-200 italic mb-4">
              “Promptster changes how you use AI within no-code platforms—from chaotic loose commands to one tight, predictable, self-learning, and scalable process.”
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
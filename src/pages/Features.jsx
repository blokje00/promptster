import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, Shield, Database, Code, Cpu } from "lucide-react";

export default function Features() {
  const features = [
    {
      title: "Prompt Management",
      icon: <Database className="w-6 h-6 text-indigo-500" />,
      description: "Centraal beheer van al je prompts met geavanceerde tagging en zoekfuncties.",
      specs: [
        "Onbeperkt aantal prompts",
        "Max. 50.000 karakters per prompt",
        "Versiebeheer met historie",
        "Tagging systeem"
      ]
    },
    {
      title: "Multi-Task Builder",
      icon: <Zap className="w-6 h-6 text-yellow-500" />,
      description: "Bouw complexe multi-step prompts door taken te combineren met context.",
      specs: [
        "Max. 50 deeltaken per prompt",
        "Sleep-en-plaats interface",
        "AI-aangedreven optimalisatie",
        "Project-specifieke templates"
      ]
    },
    {
      title: "Code Snippets",
      icon: <Code className="w-6 h-6 text-blue-500" />,
      description: "Bewaar en deel herbruikbare code snippets met syntax highlighting.",
      specs: [
        "Ondersteuning voor 20+ talen",
        "Direct kopiëren naar klembord",
        "Syntax highlighting",
        "Gekoppeld aan projecten"
      ]
    },
    {
      title: "Bestandsbeheer",
      icon: <Shield className="w-6 h-6 text-green-500" />,
      description: "Veilige opslag van screenshots en zip-bestanden bij je taken.",
      specs: [
        "Max. 10MB per afbeelding",
        "Max. 50MB per zip-bestand",
        "Automatische virusscan",
        "Veilige URL generatie"
      ]
    },
    {
      title: "AI Integratie",
      icon: <Cpu className="w-6 h-6 text-purple-500" />,
      description: "Slimme hulp bij het schrijven en verbeteren van je prompts.",
      specs: [
        "Context-aware suggesties",
        "Automatische taalverbetering",
        "Structuur analyse",
        "Token count schatting"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            PromptGuard Features
          </h1>
          <p className="text-xl text-slate-600">
            Alles wat je nodig hebt om je development workflow te versnellen
          </p>
        </div>

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

        <div className="mt-16 bg-indigo-900 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Klaar om te starten?</h2>
          <p className="mb-6 text-indigo-200">
            Probeer alle features gratis uit met ons Starter pakket.
          </p>
          <div className="flex justify-center gap-4">
            <Badge variant="outline" className="text-white border-white px-4 py-1">
              v1.2.0
            </Badge>
            <Badge variant="outline" className="text-white border-white px-4 py-1">
              Uptime 99.9%
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
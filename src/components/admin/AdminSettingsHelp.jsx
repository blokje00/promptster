import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminSettingsHelp() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="border-slate-300 hover:bg-slate-100">
          <HelpCircle className="w-5 h-5 text-slate-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">App Settings Help</DialogTitle>
          <DialogDescription>
            Complete guide to managing access settings
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">

            {/* Free Access Mode */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                1. App-Wide Access Override
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Wat het doet:</strong> Geeft alle ingelogde gebruikers volledige toegang zonder subscription checks.</p>
                <p><strong>Wanneer ON:</strong></p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Iedereen met een account heeft direct toegang</li>
                  <li>Subscription status wordt volledig genegeerd</li>
                  <li>Perfect voor beta/launch fase</li>
                  <li>Admins blijven admin rechten houden</li>
                </ul>
                <p><strong>Wanneer OFF:</strong></p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Normale subscription checks actief</li>
                  <li>Gebruikers hebben betaald abonnement nodig</li>
                  <li>Grandfathering blijft wel werken</li>
                </ul>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-2">
                  <p className="text-blue-800">💡 Tip: Gebruik dit tijdens MVP fase, schakel uit bij commerciële launch</p>
                </div>
              </div>
            </div>

            {/* Grandfathering System */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                2. Grandfathering System
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Wat het doet:</strong> Geeft gebruikers die vóór een bepaalde datum registreerden gratis levenslange toegang.</p>
                <p><strong>Hoe te gebruiken:</strong></p>
                <ol className="list-decimal ml-6 space-y-2">
                  <li>
                    <strong>Handmatige datum:</strong> Kies een specifieke datum in de datepicker
                  </li>
                  <li>
                    <strong>"Set to Today" knop:</strong> Zet de datum op vandaag (alle huidige gebruikers krijgen lifetime access)
                  </li>
                  <li>
                    Alle gebruikers met <code className="bg-slate-100 px-1 rounded">created_date</code> vóór deze datum krijgen automatisch toegang
                  </li>
                </ol>
                <p><strong>Voorbeeldscenario:</strong></p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Je hebt 100 gratis beta gebruikers</li>
                  <li>Je wilt naar betaald model</li>
                  <li>Klik "Set to Today" → alle 100 beta users krijgen lifetime access</li>
                  <li>Nieuwe registraties vanaf morgen moeten betalen</li>
                </ul>
                <div className="bg-green-50 border border-green-200 rounded p-3 mt-2">
                  <p className="text-green-800 font-medium">✅ Best practice: Grandfather early users voor loyaliteit en goodwill</p>
                </div>
              </div>
            </div>

            {/* Common Scenarios */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3">📋 Veelvoorkomende Scenario's</h3>
              <div className="space-y-4">
                
                <div className="bg-slate-50 p-4 rounded">
                  <h4 className="font-semibold mb-2">Scenario 1: Volledig open (gratis voor iedereen)</h4>
                  <ul className="text-sm space-y-1">
                    <li>✅ Free Access: <strong>ON</strong></li>
                    <li>✅ Grandfathering: <em>leeg</em></li>
                    <li className="text-green-700 mt-2">→ Iedereen met een account heeft direct toegang</li>
                  </ul>
                </div>

                <div className="bg-slate-50 p-4 rounded">
                  <h4 className="font-semibold mb-2">Scenario 2: Free Access uit, early users behouden</h4>
                  <ul className="text-sm space-y-1">
                    <li><strong>Stap 1:</strong> Klik "Set to Today" bij Grandfathering</li>
                    <li><strong>Stap 2:</strong> Zet Free Access op <strong>OFF</strong></li>
                    <li className="text-green-700 mt-2">→ Bestaande users houden toegang, nieuwe registraties niet</li>
                  </ul>
                </div>

              </div>
            </div>

            {/* Priority Order */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3">🔐 Access Check Prioriteit</h3>
              <p className="text-sm mb-3">De app controleert toegang in deze volgorde:</p>
              <ol className="list-decimal ml-6 space-y-2 text-sm">
                <li><strong>App-Wide Access</strong> → Als ON: iedereen binnen</li>
                <li><strong>Admin Role</strong> → Admins hebben altijd toegang</li>
                <li><strong>Grandfathering</strong> → Check created_date vs cutoff</li>
                <li><strong>Denied</strong> → Toegang geweigerd</li>
              </ol>
            </div>

            {/* Troubleshooting */}
            <div>
              <h3 className="text-lg font-semibold mb-3">🔧 Troubleshooting</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Probleem: Grandfathering werkt niet</p>
                  <ul className="list-disc ml-6 text-slate-600">
                    <li>Check of de datum correct is ingevuld</li>
                    <li>Verifieer dat user.created_date bestaat</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Probleem: Iedereen wordt geblokkeerd</p>
                  <ul className="list-disc ml-6 text-slate-600">
                    <li>Check of Free Access niet per ongeluk OFF staat</li>
                    <li>Als noodoplossing: zet Free Access tijdelijk ON</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
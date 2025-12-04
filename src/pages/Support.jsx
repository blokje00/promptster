import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageCircle, Send, CheckCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RequireSubscription from "../components/auth/RequireSubscription";

export default function Support() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("bug");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  /**
   * Verstuurt support bericht via email.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      toast.error("Vul alle verplichte velden in");
      return;
    }

    setIsSubmitting(true);
    try {
      const categoryLabels = {
        bug: "🐛 Bug Report",
        payment: "💳 Betalingsprobleem",
        feature: "✨ Feature Verzoek",
        other: "❓ Overig"
      };

      const emailBody = `
Support Verzoek van: ${currentUser?.full_name || "Onbekend"} (${currentUser?.email || "Geen email"})
Categorie: ${categoryLabels[category]}
Onderwerp: ${subject}

---

${message}

---

User ID: ${currentUser?.id || "N/A"}
Tijdstip: ${new Date().toLocaleString('nl-NL')}
`;

      await base44.integrations.Core.SendEmail({
        to: "support@promptster.app",
        subject: `[${categoryLabels[category]}] ${subject}`,
        body: emailBody
      });

      setSubmitted(true);
      toast.success("Support verzoek verzonden!");
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setSubject("");
        setMessage("");
        setCategory("bug");
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Support error:", error);
      toast.error("Kon support verzoek niet verzenden");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RequireSubscription>
      <div className="p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Support
              </h1>
              <p className="text-slate-600 mt-1">We helpen je graag verder</p>
            </div>
          </div>

          {submitted ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">
                  Bericht verzonden!
                </h3>
                <p className="text-green-700">
                  We hebben je verzoek ontvangen en nemen zo snel mogelijk contact op.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-indigo-600" />
                  Nieuwe Support Aanvraag
                </CardTitle>
                <CardDescription>
                  Meld een bug, betalingsprobleem of dien een feature verzoek in
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categorie *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bug">🐛 Bug / Fout</SelectItem>
                        <SelectItem value="payment">💳 Betalingsprobleem</SelectItem>
                        <SelectItem value="feature">✨ Feature Verzoek</SelectItem>
                        <SelectItem value="other">❓ Overig</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Onderwerp *</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Korte beschrijving van je verzoek..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Beschrijving *</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Geef een gedetailleerde beschrijving van je probleem of verzoek..."
                      className="min-h-[200px]"
                      required
                    />
                    <p className="text-xs text-slate-500">
                      Tip: Voeg zoveel mogelijk details toe voor snellere hulp
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !subject.trim() || !message.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Send className="w-4 h-4 mr-2 animate-pulse" />
                        Verzenden...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Verstuur Support Verzoek
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Email Configuratie Info</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Voor de domeinnaam <strong>promptster.app</strong> bij je hosting partij:
                  </p>
                  <div className="space-y-1 text-xs font-mono bg-white p-3 rounded border border-blue-200">
                    <p><strong>Email:</strong> support@promptster.app</p>
                    <p><strong>Type:</strong> Forward/Alias</p>
                    <p><strong>Doel:</strong> Je persoonlijke email</p>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Configureer een email forward van support@promptster.app naar je persoonlijke email bij je DNS/hosting provider.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </RequireSubscription>
  );
}
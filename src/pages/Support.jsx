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
import AccessGuard from "../components/auth/AccessGuard";
import { useAutosaveField } from "@/components/hooks/useAutosaveField";

export default function Support() {
  const navigate = useNavigate();
  const [category, setCategory] = useState("bug");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Autosave for subject and message fields
  const { value: subject, setValue: setSubject, resetValue: resetSubject } = useAutosaveField({
    storageKey: `promptster:support:subject:${currentUser?.id ?? 'anon'}`,
    initialValue: "",
    enabled: !!currentUser?.id,
  });

  const { value: message, setValue: setMessage, resetValue: resetMessage } = useAutosaveField({
    storageKey: `promptster:support:message:${currentUser?.id ?? 'anon'}`,
    initialValue: "",
    enabled: !!currentUser?.id,
  });

  /**
   * Verstuurt support bericht door het op te slaan als ticket.
   * Admin ontvangt notificatie via het dashboard.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Save as support ticket in database
      await base44.entities.SupportTicket.create({
        category: category,
        subject: subject.trim(),
        message: message.trim(),
        user_email: currentUser?.email || "unknown",
        user_name: currentUser?.full_name || "Unknown",
        status: "open"
      });

      setSubmitted(true);
      toast.success("Support request submitted!");
      
      // Clear autosave drafts and reset form after 3 seconds
      resetSubject();
      resetMessage();
      setTimeout(() => {
        setCategory("bug");
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Support error:", error);
      toast.error("Could not submit support request: " + (error.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessGuard pageType="public">
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
              <p className="text-slate-600 mt-1">We're happy to help</p>
            </div>
          </div>

          {submitted ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">
                  Message sent!
                </h3>
                <p className="text-green-700">
                  We have received your request and will contact you as soon as possible.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-indigo-600" />
                  New Support Request
                </CardTitle>
                <CardDescription>
                  Report a bug, payment issue or submit a feature request
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bug">🐛 Bug / Error</SelectItem>
                        <SelectItem value="payment">💳 Payment Issue</SelectItem>
                        <SelectItem value="feature">✨ Feature Request</SelectItem>
                        <SelectItem value="other">❓ Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Short description of your request..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Description *</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Give a detailed description of your problem or request..."
                      className="min-h-[200px]"
                      required
                    />
                    <p className="text-xs text-slate-500">
                      Tip: Add as many details as possible for faster help
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
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Support Request
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">✓ Support system active</h4>
                  <p className="text-sm text-green-700">
                    Your request will be saved and we will contact you as soon as possible via <strong>{currentUser?.email}</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AccessGuard>
  );
}
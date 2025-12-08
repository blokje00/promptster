import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Shield, Cookie, AlertCircle, CreditCard, Users, Lock, Mail } from "lucide-react";

export default function Legal() {
  const lastUpdated = "January 29, 2025";
  const companyName = "Promptster B.V.";
  const supportEmail = "support@promptster.app";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Legal & Compliance
          </h1>
          <p className="text-slate-600 mt-2">All terms, policies and legal documentation</p>
        </div>

        <Tabs defaultValue="tos" className="space-y-6">
          <TabsList className="bg-white grid grid-cols-4 lg:grid-cols-8 gap-1 p-1 h-auto flex-wrap">
            <TabsTrigger value="tos" className="data-[state=active]:bg-indigo-100"><FileText className="w-4 h-4 mr-1" /> Terms</TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-indigo-100"><Shield className="w-4 h-4 mr-1" /> Privacy</TabsTrigger>
            <TabsTrigger value="cookies" className="data-[state=active]:bg-indigo-100"><Cookie className="w-4 h-4 mr-1" /> Cookies</TabsTrigger>
            <TabsTrigger value="aup" className="data-[state=active]:bg-indigo-100"><AlertCircle className="w-4 h-4 mr-1" /> AUP</TabsTrigger>
            <TabsTrigger value="refund" className="data-[state=active]:bg-indigo-100"><CreditCard className="w-4 h-4 mr-1" /> Refunds</TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-indigo-100"><AlertCircle className="w-4 h-4 mr-1" /> AI</TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-indigo-100"><Lock className="w-4 h-4 mr-1" /> Security</TabsTrigger>
            <TabsTrigger value="contact" className="data-[state=active]:bg-indigo-100"><Mail className="w-4 h-4 mr-1" /> Support</TabsTrigger>
          </TabsList>

          {/* Terms of Service */}
          <TabsContent value="tos">
            <Card>
              <CardHeader>
                <CardTitle>Terms of Service</CardTitle>
                <p className="text-sm text-slate-500">Last Updated: {lastUpdated}</p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="prose prose-slate max-w-none">
                    <p>Welcome to Promptster ("the Service"), owned and operated by {companyName} ("we", "us", "our"). By creating an account, subscribing, or using the Service, you agree to these Terms of Service.</p>
                    
                    <h3>1. Description of the Service</h3>
                    <p>Promptster is a SaaS platform that helps users create, manage, and optimize multi-step prompts and workflows for use on various no-code platforms and AI providers. The Service is offered on an "as-is" basis.</p>
                    
                    <h3>2. Eligibility</h3>
                    <p>You must be at least 16 years old or the legal age in your jurisdiction to use the Service.</p>
                    
                    <h3>3. Subscriptions & Billing</h3>
                    <ul>
                      <li>Subscriptions renew automatically unless cancelled.</li>
                      <li>Prices may change; users will be notified in advance.</li>
                      <li>Refunds are only provided where required by law.</li>
                    </ul>
                    
                    <h3>4. User Responsibilities</h3>
                    <p>Users agree not to:</p>
                    <ul>
                      <li>Misuse, disrupt, or overload the platform</li>
                      <li>Submit illegal, abusive, or harmful content</li>
                      <li>Attempt to reverse engineer the Service</li>
                      <li>Circumvent billing or subscription restrictions</li>
                    </ul>
                    
                    <h3>5. Our Right to Suspend or Terminate Accounts</h3>
                    <p>Promptster reserves the right to suspend or terminate any account at any time if:</p>
                    <ul>
                      <li>The user violates these Terms</li>
                      <li>The user engages in abusive, harmful, or disruptive behavior</li>
                      <li>The user becomes excessively demanding, hostile, or obstructive in communications ("difficult customer clause")</li>
                    </ul>
                    <p>In such cases, we may immediately deactivate the account without refund.</p>
                    
                    <h3>6. Intellectual Property</h3>
                    <p>All platform code, algorithms, and design elements are owned by Promptster. Users retain ownership of the prompts they create.</p>
                    
                    <h3>7. AI Provider Interaction</h3>
                    <p>Promptster may transmit user text or images to third-party AI providers to generate results. We offer no guarantee regarding output accuracy, safety, or legality. Users remain responsible for reviewing all AI-generated content.</p>
                    
                    <h3>8. Limitation of Liability</h3>
                    <p>To the maximum extent permitted by law:</p>
                    <ul>
                      <li>We are not liable for decisions made based on AI output</li>
                      <li>We are not liable for service interruptions, data loss, or indirect damages</li>
                    </ul>
                    
                    <h3>9. Termination by User</h3>
                    <p>Users may cancel their subscription at any time through the billing portal. Cancellation halts future billing.</p>
                    
                    <h3>10. Governing Law</h3>
                    <p>These Terms are governed by the laws of the Netherlands, unless otherwise required by local consumer laws.</p>
                    
                    <h3>11. Changes to Terms</h3>
                    <p>We may update these Terms at any time. Continued use after changes implies acceptance.</p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Policy */}
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Policy</CardTitle>
                <p className="text-sm text-slate-500">Last Updated: {lastUpdated}</p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="prose prose-slate max-w-none">
                    <p>Promptster ("we", "us") respects your privacy. This Privacy Policy explains how we collect, use, store, and protect your information.</p>
                    
                    <h3>1. Data We Collect</h3>
                    <ul>
                      <li>Account data (email, name)</li>
                      <li>Billing data (processed via Stripe; we never store card numbers)</li>
                      <li>Usage data (actions inside the platform)</li>
                      <li>Uploaded screenshots or files</li>
                      <li>AI prompt content</li>
                    </ul>
                    
                    <h3>2. Legal Basis for Processing (GDPR)</h3>
                    <p>We process data under:</p>
                    <ul>
                      <li>Contract necessity (providing the Service)</li>
                      <li>Legal obligation (tax, billing)</li>
                      <li>Consent (cookies)</li>
                      <li>Legitimate interest (fraud prevention, security)</li>
                    </ul>
                    
                    <h3>3. How We Use Your Data</h3>
                    <ul>
                      <li>Delivering core functionality</li>
                      <li>Improving performance and UX</li>
                      <li>Troubleshooting issues</li>
                      <li>Billing and subscription management</li>
                      <li>AI output generation via subprocessors</li>
                      <li>Security and abuse prevention</li>
                    </ul>
                    
                    <h3>4. Subprocessors</h3>
                    <p>We use the following service providers:</p>
                    <ul>
                      <li>Base44 – infrastructure & serverless hosting</li>
                      <li>Stripe – payments</li>
                      <li>Supabase – file/object storage</li>
                      <li>OpenAI / Anthropic / Google – optional AI processing</li>
                      <li>Email provider for notifications</li>
                    </ul>
                    
                    <h3>5. International Transfers</h3>
                    <p>Data may be transferred outside the EU using Standard Contractual Clauses (SCCs).</p>
                    
                    <h3>6. Data Retention</h3>
                    <p>We keep data only as long as needed for contract performance, legal obligations, and user support. Users may request deletion at any time.</p>
                    
                    <h3>7. User Rights</h3>
                    <p>Under GDPR you may:</p>
                    <ul>
                      <li>Access your data</li>
                      <li>Request correction or deletion</li>
                      <li>Export your data</li>
                      <li>Object to processing</li>
                      <li>Withdraw consent where applicable</li>
                    </ul>
                    <p>Request via: {supportEmail}</p>
                    
                    <h3>8. Security</h3>
                    <p>We use modern security practices including encryption, access controls, and monitoring.</p>
                    
                    <h3>9. Children</h3>
                    <p>We do not knowingly collect data from children under 16.</p>
                    
                    <h3>10. Updates</h3>
                    <p>We may update this Privacy Policy at any time.</p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cookie Policy */}
          <TabsContent value="cookies">
            <Card>
              <CardHeader>
                <CardTitle>Cookie Policy</CardTitle>
                <p className="text-sm text-slate-500">Last Updated: {lastUpdated}</p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="prose prose-slate max-w-none">
                    <h3>What Are Cookies?</h3>
                    <p>Cookies are small text files stored on your device when you visit our website.</p>
                    
                    <h3>Types of Cookies We Use</h3>
                    <ul>
                      <li><strong>Essential Cookies:</strong> Required for authentication and core functionality</li>
                      <li><strong>Analytics Cookies:</strong> Help us understand usage patterns (optional)</li>
                      <li><strong>Preference Cookies:</strong> Remember your settings and language</li>
                    </ul>
                    
                    <h3>Managing Cookies</h3>
                    <p>You can control cookies through your browser settings. Note that disabling essential cookies may impact functionality.</p>
                    
                    <h3>Third-Party Cookies</h3>
                    <p>Some features may use third-party cookies from services like Stripe for payment processing.</p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Acceptable Use Policy */}
          <TabsContent value="aup">
            <Card>
              <CardHeader>
                <CardTitle>Acceptable Use Policy</CardTitle>
                <p className="text-sm text-slate-500">Last Updated: {lastUpdated}</p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="prose prose-slate max-w-none">
                    <p>Users must NOT:</p>
                    <ul>
                      <li>Use Promptster for illegal activities</li>
                      <li>Automate harassment, hate speech, or harmful content</li>
                      <li>Attempt to overload or disrupt the Service</li>
                      <li>Run excessive API calls that degrade stability</li>
                      <li>Upload viruses, malware, or harmful files</li>
                      <li>Share login credentials with others</li>
                      <li>Attempt to reverse engineer or copy the platform</li>
                      <li>Violate intellectual property rights</li>
                      <li>Engage in fraudulent activities or payment circumvention</li>
                    </ul>
                    
                    <h3>Consequences</h3>
                    <p>We may suspend or terminate accounts violating this policy without prior notice or refund.</p>
                    
                    <h3>Reporting Violations</h3>
                    <p>If you observe policy violations, please report them to {supportEmail}</p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Refund & Cancellation */}
          <TabsContent value="refund">
            <Card>
              <CardHeader>
                <CardTitle>Refund & Cancellation Policy</CardTitle>
                <p className="text-sm text-slate-500">Last Updated: {lastUpdated}</p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="prose prose-slate max-w-none">
                    <h3>Subscription Terms</h3>
                    <ul>
                      <li>Subscriptions renew monthly or annually depending on your plan</li>
                      <li>Subscriptions renew automatically unless cancelled before the renewal date</li>
                      <li>Prices may change with prior notice (30 days minimum)</li>
                      <li>Taxes (VAT, Sales Tax) may apply depending on your region</li>
                    </ul>
                    
                    <h3>Cancellation</h3>
                    <p>Users can cancel at any time via the billing portal or subscription settings. Cancellation stops future billing but does not refund past charges.</p>
                    
                    <h3>Refund Policy</h3>
                    <p>Refunds are granted only when required by law—for example in the EU under consumer protection rules for digital services. Refund requests must be submitted within 14 days of purchase for EU customers.</p>
                    
                    <h3>Failed Payments</h3>
                    <p>Failed payments may lead to suspension of access. We will attempt to contact you before suspension.</p>
                    
                    <h3>Plan Changes</h3>
                    <ul>
                      <li>Upgrades take effect immediately</li>
                      <li>Downgrades apply at next billing cycle</li>
                      <li>No partial refunds for downgrades</li>
                    </ul>
                    
                    <h3>Contact</h3>
                    <p>For billing inquiries: {supportEmail}</p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Disclaimer */}
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>AI Disclaimer</CardTitle>
                <p className="text-sm text-slate-500">Last Updated: {lastUpdated}</p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="prose prose-slate max-w-none">
                    <h3>AI-Generated Content</h3>
                    <p>Promptster uses external AI providers (OpenAI, Anthropic, Google) to generate output and assist with features.</p>
                    
                    <h3>No Guarantees</h3>
                    <p>We cannot guarantee that:</p>
                    <ul>
                      <li>AI output is correct or accurate</li>
                      <li>AI output is safe for production use</li>
                      <li>AI output complies with copyright laws</li>
                      <li>AI output is free from bias or harmful content</li>
                      <li>AI output meets your specific requirements</li>
                    </ul>
                    
                    <h3>User Responsibility</h3>
                    <p>Users are responsible for:</p>
                    <ul>
                      <li>Reviewing all AI-generated content before use</li>
                      <li>Verifying accuracy and safety</li>
                      <li>Ensuring compliance with applicable laws</li>
                      <li>Obtaining necessary rights or licenses</li>
                    </ul>
                    
                    <h3>Limitation of Liability</h3>
                    <p>Promptster is not liable for damages arising from the use of AI-generated content, including but not limited to:</p>
                    <ul>
                      <li>Incorrect or misleading information</li>
                      <li>Copyright or IP violations</li>
                      <li>Financial losses</li>
                      <li>Reputational damage</li>
                      <li>Security vulnerabilities</li>
                    </ul>
                    
                    <h3>Data Processing</h3>
                    <p>When you use AI features, your prompts and uploaded content may be sent to third-party AI providers. See our Privacy Policy for details.</p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Practices</CardTitle>
                <p className="text-sm text-slate-500">Last Updated: {lastUpdated}</p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="prose prose-slate max-w-none">
                    <p>Promptster follows industry-standard security practices to protect your data.</p>
                    
                    <h3>Technical Measures</h3>
                    <ul>
                      <li>Encrypted storage (AES-256)</li>
                      <li>SSL/TLS encryption in transit</li>
                      <li>Role-based access control (RBAC)</li>
                      <li>Monitoring and rate limiting</li>
                      <li>Regular vulnerability reviews</li>
                      <li>Principle of least privilege</li>
                      <li>Automated backups</li>
                      <li>Secure authentication (OAuth 2.0)</li>
                    </ul>
                    
                    <h3>Organizational Measures</h3>
                    <ul>
                      <li>Employee security training</li>
                      <li>Access controls and audit logs</li>
                      <li>Incident response procedures</li>
                      <li>Data protection impact assessments</li>
                    </ul>
                    
                    <h3>Infrastructure</h3>
                    <p>Our infrastructure is hosted on Base44 and Supabase, which maintain SOC 2 Type II compliance and follow industry best practices.</p>
                    
                    <h3>Reporting Security Issues</h3>
                    <p>If you discover a security vulnerability, please report it immediately to: {supportEmail}</p>
                    <p>We appreciate responsible disclosure and will respond within 48 hours.</p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support/Contact */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Support & Contact</CardTitle>
                <p className="text-sm text-slate-500">Last Updated: {lastUpdated}</p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="prose prose-slate max-w-none">
                    <h3>Contact Information</h3>
                    <p><strong>Email:</strong> {supportEmail}</p>
                    <p><strong>Company:</strong> {companyName}</p>
                    
                    <h3>Support Response Times</h3>
                    <ul>
                      <li>General inquiries: Within 48 hours</li>
                      <li>Billing issues: Within 24 hours</li>
                      <li>Security concerns: Within 24 hours</li>
                      <li>Technical support: Within 48 hours</li>
                    </ul>
                    
                    <h3>What We Can Help With</h3>
                    <ul>
                      <li>Account and billing questions</li>
                      <li>Technical issues and bugs</li>
                      <li>Feature requests and feedback</li>
                      <li>Data export requests</li>
                      <li>GDPR and privacy inquiries</li>
                      <li>Security concerns</li>
                    </ul>
                    
                    <h3>Self-Service Resources</h3>
                    <ul>
                      <li>Billing Portal: Manage subscriptions in your account settings</li>
                      <li>Data Export: Available in Dashboard → Export Data</li>
                      <li>Account Deletion: Contact support for account deletion requests</li>
                    </ul>
                    
                    <h3>Complaints</h3>
                    <p>If you have a complaint, please email us at {supportEmail}. We will investigate and respond within 7 business days.</p>
                    
                    <h3>Data Protection Authority</h3>
                    <p>For privacy-related complaints, you may also contact your local data protection authority.</p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
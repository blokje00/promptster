import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Shield, Cookie, AlertCircle, CreditCard, Users, Lock, Mail } from "lucide-react";

export default function Legal() {
  const lastUpdated = "January 29, 2025";
  const companyName = "Promptster.app";
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
                  <div className="prose prose-slate max-w-none space-y-6">
                    <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r">
                      <p className="font-medium text-indigo-900 mb-2">Welcome to Promptster</p>
                      <p className="text-sm text-indigo-800">By creating an account, subscribing, or using the Service, you agree to these Terms of Service. The Service is owned and operated by {companyName} ("we", "us", "our").</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">1. Description of the Service</h3>
                      <p className="text-slate-700 leading-relaxed">Promptster is a SaaS platform that helps users create, manage, and optimize multi-step prompts and workflows for use on various no-code platforms and AI providers.</p>
                      <p className="text-slate-600 text-sm mt-2">The Service is offered on an "as-is" basis.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">2. Eligibility</h3>
                      <p className="text-slate-700">You must be at least <strong>16 years old</strong> or the legal age in your jurisdiction to use the Service.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">3. Subscriptions & Billing</h3>
                      <ul className="space-y-2 text-slate-700">
                        <li>• Subscriptions renew <strong>automatically</strong> unless cancelled</li>
                        <li>• Prices may change; users will be notified in advance</li>
                        <li>• Refunds are only provided where required by law</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">4. User Responsibilities</h3>
                      <p className="text-slate-700 mb-2">Users agree <strong>not to</strong>:</p>
                      <ul className="space-y-2 text-slate-700">
                        <li>• Misuse, disrupt, or overload the platform</li>
                        <li>• Submit illegal, abusive, or harmful content</li>
                        <li>• Attempt to reverse engineer the Service</li>
                        <li>• Circumvent billing or subscription restrictions</li>
                      </ul>
                    </div>
                    
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r">
                      <h3 className="text-lg font-bold text-amber-900 mb-3">5. Our Right to Suspend or Terminate Accounts</h3>
                      <p className="text-amber-800 mb-2">Promptster reserves the right to suspend or terminate any account at any time if:</p>
                      <ul className="space-y-2 text-amber-800">
                        <li>• The user violates these Terms</li>
                        <li>• The user engages in abusive, harmful, or disruptive behavior</li>
                        <li>• The user becomes excessively demanding, hostile, or obstructive in communications ("difficult customer clause")</li>
                      </ul>
                      <p className="text-amber-900 font-medium mt-3">In such cases, we may immediately deactivate the account without refund.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">6. Intellectual Property</h3>
                      <p className="text-slate-700 leading-relaxed">All platform code, algorithms, and design elements are owned by Promptster.</p>
                      <p className="text-indigo-700 font-medium mt-2">✓ Users retain ownership of the prompts they create.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">7. AI Provider Interaction</h3>
                      <p className="text-slate-700 leading-relaxed mb-3">Promptster may transmit user text or images to third-party AI providers to generate results.</p>
                      <p className="text-red-700 font-medium">⚠ We offer no guarantee regarding output accuracy, safety, or legality.</p>
                      <p className="text-slate-600 mt-2">Users remain responsible for reviewing all AI-generated content.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">8. Limitation of Liability</h3>
                      <p className="text-slate-700 mb-2">To the maximum extent permitted by law:</p>
                      <ul className="space-y-2 text-slate-700">
                        <li>• We are <strong>not liable</strong> for decisions made based on AI output</li>
                        <li>• We are <strong>not liable</strong> for service interruptions, data loss, or indirect damages</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">9. Termination by User</h3>
                      <p className="text-slate-700">Users may cancel their subscription at any time through the billing portal. Cancellation halts future billing.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">10. Governing Law</h3>
                      <p className="text-slate-700">These Terms are governed by the laws of the <strong>Netherlands</strong>, unless otherwise required by local consumer laws.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">11. Changes to Terms</h3>
                      <p className="text-slate-700">We may update these Terms at any time. Continued use after changes implies acceptance.</p>
                    </div>
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
                  <div className="prose prose-slate max-w-none space-y-6">
                    <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r">
                      <p className="font-medium text-indigo-900">Promptster respects your privacy. This Privacy Policy explains how we collect, use, store, and protect your information.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">1. Data We Collect</h3>
                      <ul className="space-y-2 text-slate-700">
                        <li>• <strong>Account data:</strong> Email, name</li>
                        <li>• <strong>Billing data:</strong> Processed via Stripe (we never store card numbers)</li>
                        <li>• <strong>Usage data:</strong> Actions inside the platform</li>
                        <li>• <strong>Files:</strong> Uploaded screenshots or files</li>
                        <li>• <strong>Content:</strong> AI prompt content</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">2. Legal Basis for Processing (GDPR)</h3>
                      <p className="text-slate-700 mb-2">We process data under:</p>
                      <ul className="space-y-2 text-slate-700">
                        <li>• <strong>Contract necessity:</strong> Providing the Service</li>
                        <li>• <strong>Legal obligation:</strong> Tax, billing compliance</li>
                        <li>• <strong>Consent:</strong> Cookies and analytics</li>
                        <li>• <strong>Legitimate interest:</strong> Fraud prevention, security</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">3. How We Use Your Data</h3>
                      <ul className="space-y-2 text-slate-700">
                        <li>• Delivering core functionality</li>
                        <li>• Improving performance and UX</li>
                        <li>• Troubleshooting issues</li>
                        <li>• Billing and subscription management</li>
                        <li>• AI output generation via subprocessors</li>
                        <li>• Security and abuse prevention</li>
                      </ul>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h3 className="text-lg font-bold text-slate-900 mb-3">4. Subprocessors</h3>
                      <p className="text-slate-700 mb-3">We use the following trusted service providers:</p>
                      <ul className="space-y-2 text-slate-700">
                        <li>• <strong>Base44</strong> – Infrastructure & serverless hosting</li>
                        <li>• <strong>Stripe</strong> – Payment processing</li>
                        <li>• <strong>Supabase</strong> – File/object storage</li>
                        <li>• <strong>OpenAI / Anthropic / Google</strong> – Optional AI processing</li>
                        <li>• <strong>Email provider</strong> – Transactional notifications</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">5. International Transfers</h3>
                      <p className="text-slate-700">Data may be transferred outside the EU using <strong>Standard Contractual Clauses (SCCs)</strong> to ensure adequate protection.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">6. Data Retention</h3>
                      <p className="text-slate-700 mb-2">We keep data only as long as needed for:</p>
                      <ul className="space-y-2 text-slate-700">
                        <li>• Contract performance</li>
                        <li>• Legal obligations</li>
                        <li>• User support</li>
                      </ul>
                      <p className="text-indigo-700 font-medium mt-3">✓ Users may request deletion at any time.</p>
                    </div>
                    
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r">
                      <h3 className="text-lg font-bold text-green-900 mb-3">7. Your GDPR Rights</h3>
                      <p className="text-green-800 mb-2">Under GDPR you may:</p>
                      <ul className="space-y-2 text-green-800">
                        <li>• <strong>Access</strong> your data</li>
                        <li>• Request <strong>correction or deletion</strong></li>
                        <li>• <strong>Export</strong> your data</li>
                        <li>• <strong>Object</strong> to processing</li>
                        <li>• <strong>Withdraw consent</strong> where applicable</li>
                      </ul>
                      <p className="text-green-900 font-medium mt-3">📧 Contact: {supportEmail}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">8. Security</h3>
                      <p className="text-slate-700">We use modern security practices including encryption, access controls, and monitoring.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">9. Children</h3>
                      <p className="text-slate-700">We do <strong>not knowingly</strong> collect data from children under 16.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">10. Updates</h3>
                      <p className="text-slate-700">We may update this Privacy Policy at any time. Continued use implies acceptance.</p>
                    </div>
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
                  <div className="prose prose-slate max-w-none space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">What Are Cookies?</h3>
                      <p className="text-slate-700">Cookies are small text files stored on your device when you visit our website. They help us provide essential functionality and improve your experience.</p>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h3 className="text-lg font-bold text-slate-900 mb-3">Types of Cookies We Use</h3>
                      <ul className="space-y-3 text-slate-700">
                        <li>
                          <strong>🔒 Essential Cookies:</strong>
                          <p className="mt-1 text-sm">Required for authentication and core functionality</p>
                        </li>
                        <li>
                          <strong>📊 Analytics Cookies:</strong>
                          <p className="mt-1 text-sm">Help us understand usage patterns (optional)</p>
                        </li>
                        <li>
                          <strong>⚙️ Preference Cookies:</strong>
                          <p className="mt-1 text-sm">Remember your settings and language</p>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">Managing Cookies</h3>
                      <p className="text-slate-700 mb-2">You can control cookies through your browser settings.</p>
                      <p className="text-amber-700 bg-amber-50 p-3 rounded text-sm">⚠ Note: Disabling essential cookies may impact functionality.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">Third-Party Cookies</h3>
                      <p className="text-slate-700">Some features may use third-party cookies from services like <strong>Stripe</strong> for payment processing.</p>
                    </div>
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
                  <div className="prose prose-slate max-w-none space-y-6">
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
                      <p className="font-bold text-red-900 mb-3">Users must NOT:</p>
                      <ul className="space-y-2 text-red-800">
                        <li>❌ Use Promptster for illegal activities</li>
                        <li>❌ Automate harassment, hate speech, or harmful content</li>
                        <li>❌ Attempt to overload or disrupt the Service</li>
                        <li>❌ Run excessive API calls that degrade stability</li>
                        <li>❌ Upload viruses, malware, or harmful files</li>
                        <li>❌ Share login credentials with others</li>
                        <li>❌ Attempt to reverse engineer or copy the platform</li>
                        <li>❌ Violate intellectual property rights</li>
                        <li>❌ Engage in fraudulent activities or payment circumvention</li>
                      </ul>
                    </div>
                    
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <h3 className="text-lg font-bold text-amber-900 mb-3">⚠ Consequences</h3>
                      <p className="text-amber-800">We may <strong>suspend or terminate</strong> accounts violating this policy without prior notice or refund.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">Reporting Violations</h3>
                      <p className="text-slate-700">If you observe policy violations, please report them to:</p>
                      <p className="text-indigo-700 font-medium mt-2">📧 {supportEmail}</p>
                    </div>
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
                  <div className="prose prose-slate max-w-none space-y-6">
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <h3 className="text-lg font-bold text-indigo-900 mb-3">Subscription Terms</h3>
                      <ul className="space-y-2 text-indigo-800">
                        <li>• Subscriptions renew <strong>monthly or annually</strong> depending on your plan</li>
                        <li>• Subscriptions renew <strong>automatically</strong> unless cancelled before the renewal date</li>
                        <li>• Prices may change with prior notice (30 days minimum)</li>
                        <li>• Taxes (VAT, Sales Tax) may apply depending on your region</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">Cancellation</h3>
                      <p className="text-slate-700 mb-2">Users can cancel at any time via the billing portal or subscription settings.</p>
                      <p className="text-amber-700 bg-amber-50 p-3 rounded text-sm">⚠ Cancellation stops future billing but does not refund past charges.</p>
                    </div>
                    
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r">
                      <h3 className="text-lg font-bold text-green-900 mb-3">Refund Policy</h3>
                      <p className="text-green-800 mb-2">Refunds are granted only when required by law.</p>
                      <p className="text-green-800">For example: EU customers have a <strong>14-day right of withdrawal</strong> for digital services under consumer protection rules.</p>
                      <p className="text-sm text-green-700 mt-3">Refund requests must be submitted within 14 days of purchase for EU customers.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">Failed Payments</h3>
                      <p className="text-slate-700">Failed payments may lead to suspension of access. We will attempt to contact you before suspension.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">Plan Changes</h3>
                      <ul className="space-y-2 text-slate-700">
                        <li>• <strong>Upgrades:</strong> Take effect immediately</li>
                        <li>• <strong>Downgrades:</strong> Apply at next billing cycle</li>
                        <li>• <strong>Refunds:</strong> No partial refunds for downgrades</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">Contact</h3>
                      <p className="text-slate-700">For billing inquiries:</p>
                      <p className="text-indigo-700 font-medium mt-2">📧 {supportEmail}</p>
                    </div>
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
                  <div className="prose prose-slate max-w-none space-y-6">
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="text-lg font-bold text-purple-900 mb-3">🤖 AI-Generated Content</h3>
                      <p className="text-purple-800">Promptster uses external AI providers (<strong>OpenAI, Anthropic, Google</strong>) to generate output and assist with features.</p>
                    </div>
                    
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
                      <h3 className="text-lg font-bold text-red-900 mb-3">⚠ No Guarantees</h3>
                      <p className="text-red-800 mb-2">We <strong>cannot guarantee</strong> that:</p>
                      <ul className="space-y-2 text-red-800">
                        <li>❌ AI output is correct or accurate</li>
                        <li>❌ AI output is safe for production use</li>
                        <li>❌ AI output complies with copyright laws</li>
                        <li>❌ AI output is free from bias or harmful content</li>
                        <li>❌ AI output meets your specific requirements</li>
                      </ul>
                    </div>
                    
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <h3 className="text-lg font-bold text-amber-900 mb-3">👤 Your Responsibility</h3>
                      <p className="text-amber-800 mb-2">Users are responsible for:</p>
                      <ul className="space-y-2 text-amber-800">
                        <li>✓ Reviewing all AI-generated content before use</li>
                        <li>✓ Verifying accuracy and safety</li>
                        <li>✓ Ensuring compliance with applicable laws</li>
                        <li>✓ Obtaining necessary rights or licenses</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">Limitation of Liability</h3>
                      <p className="text-slate-700 mb-2">Promptster is <strong>not liable</strong> for damages arising from the use of AI-generated content, including but not limited to:</p>
                      <ul className="space-y-2 text-slate-700">
                        <li>• Incorrect or misleading information</li>
                        <li>• Copyright or IP violations</li>
                        <li>• Financial losses</li>
                        <li>• Reputational damage</li>
                        <li>• Security vulnerabilities</li>
                      </ul>
                    </div>
                    
                    <div className="bg-slate-100 p-4 rounded-lg">
                      <h3 className="text-lg font-bold text-slate-900 mb-3">🔒 Data Processing</h3>
                      <p className="text-slate-700">When you use AI features, your prompts and uploaded content may be sent to third-party AI providers.</p>
                      <p className="text-indigo-700 font-medium mt-2">See our Privacy Policy for details.</p>
                    </div>
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
                  <div className="prose prose-slate max-w-none space-y-6">
                    <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r">
                      <p className="font-medium text-indigo-900">Promptster follows industry-standard security practices to protect your data.</p>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h3 className="text-lg font-bold text-slate-900 mb-3">🔐 Technical Measures</h3>
                      <ul className="space-y-2 text-slate-700">
                        <li>• <strong>Encrypted storage:</strong> AES-256</li>
                        <li>• <strong>Encryption in transit:</strong> SSL/TLS</li>
                        <li>• <strong>Access control:</strong> Role-based (RBAC)</li>
                        <li>• <strong>Protection:</strong> Monitoring and rate limiting</li>
                        <li>• <strong>Reviews:</strong> Regular vulnerability assessments</li>
                        <li>• <strong>Principle:</strong> Least privilege</li>
                        <li>• <strong>Backups:</strong> Automated and encrypted</li>
                        <li>• <strong>Authentication:</strong> Secure OAuth 2.0</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">👥 Organizational Measures</h3>
                      <ul className="space-y-2 text-slate-700">
                        <li>• Employee security training</li>
                        <li>• Access controls and audit logs</li>
                        <li>• Incident response procedures</li>
                        <li>• Data protection impact assessments</li>
                      </ul>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="text-lg font-bold text-green-900 mb-3">🏗️ Infrastructure</h3>
                      <p className="text-green-800">Our infrastructure is hosted on <strong>Base44</strong> and <strong>Supabase</strong>, which maintain <strong>SOC 2 Type II compliance</strong> and follow industry best practices.</p>
                    </div>
                    
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
                      <h3 className="text-lg font-bold text-red-900 mb-3">🚨 Reporting Security Issues</h3>
                      <p className="text-red-800 mb-2">If you discover a security vulnerability, please report it immediately to:</p>
                      <p className="text-red-900 font-bold mt-2">📧 {supportEmail}</p>
                      <p className="text-red-700 text-sm mt-3">We appreciate responsible disclosure and will respond within <strong>48 hours</strong>.</p>
                    </div>
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
                  <div className="prose prose-slate max-w-none space-y-6">
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <h3 className="text-lg font-bold text-indigo-900 mb-3">📞 Contact Information</h3>
                      <p className="text-indigo-800"><strong>Email:</strong> {supportEmail}</p>
                      <p className="text-indigo-800"><strong>Company:</strong> {companyName}</p>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h3 className="text-lg font-bold text-slate-900 mb-3">⏱️ Support Response Times</h3>
                      <ul className="space-y-2 text-slate-700">
                        <li>• <strong>General inquiries:</strong> Within 48 hours</li>
                        <li>• <strong>Billing issues:</strong> Within 24 hours</li>
                        <li>• <strong>Security concerns:</strong> Within 24 hours</li>
                        <li>• <strong>Technical support:</strong> Within 48 hours</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">✓ What We Can Help With</h3>
                      <ul className="space-y-2 text-slate-700">
                        <li>• Account and billing questions</li>
                        <li>• Technical issues and bugs</li>
                        <li>• Feature requests and feedback</li>
                        <li>• Data export requests</li>
                        <li>• GDPR and privacy inquiries</li>
                        <li>• Security concerns</li>
                      </ul>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="text-lg font-bold text-green-900 mb-3">🛠️ Self-Service Resources</h3>
                      <ul className="space-y-2 text-green-800">
                        <li>• <strong>Billing Portal:</strong> Manage subscriptions in your account settings</li>
                        <li>• <strong>Data Export:</strong> Available in Dashboard → Export Data</li>
                        <li>• <strong>Account Deletion:</strong> Contact support for account deletion requests</li>
                      </ul>
                    </div>
                    
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r">
                      <h3 className="text-lg font-bold text-amber-900 mb-3">💬 Complaints</h3>
                      <p className="text-amber-800">If you have a complaint, please email us at <strong>{supportEmail}</strong>.</p>
                      <p className="text-amber-700 text-sm mt-2">We will investigate and respond within <strong>7 business days</strong>.</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">🏛️ Data Protection Authority</h3>
                      <p className="text-slate-700">For privacy-related complaints, you may also contact your local data protection authority.</p>
                    </div>
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
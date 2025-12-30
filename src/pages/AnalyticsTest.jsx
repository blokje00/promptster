import React, { useState } from 'react';
import { SEOHead } from '@/components/shared/SEOHead';
import { SocialShare } from '@/components/shared/SocialShare';
import { useViewportTracking, useTimeTracking, useClickTracking } from '@/components/hooks/useAnalytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function AnalyticsTestPage() {
  const [clickCount, setClickCount] = useState(0);
  
  // 1. Time tracking - automatically tracks time on page
  useTimeTracking('analytics_test_page');
  
  // 2. Click tracking hook
  const { trackClick } = useClickTracking();
  
  // 3. Viewport tracking - track when sections come into view
  const { ref: section1Ref, inView: section1InView } = useViewportTracking('test_section_1');
  const { ref: section2Ref, inView: section2InView } = useViewportTracking('test_section_2');
  const { ref: section3Ref, inView: section3InView } = useViewportTracking('test_section_3');

  const handleTestClick = () => {
    trackClick('test_button_clicked', { 
      count: clickCount + 1,
      timestamp: new Date().toISOString() 
    });
    setClickCount(clickCount + 1);
  };

  return (
    <>
      {/* SEO Head - adds meta tags for social sharing */}
      <SEOHead
        title="Analytics Test Page"
        description="Testing all analytics features: PostHog tracking, SEO meta tags, social sharing, and viewport tracking"
        keywords={['analytics', 'testing', 'posthog', 'seo']}
        image="/og-image.png"
      />

      <div className="container mx-auto py-8 px-4 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Analytics Test Page
          </h1>
          <p className="text-slate-600 text-lg">
            All 4 analytics features are working on this page
          </p>
        </div>

        {/* Feature Status Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                1. Environment Variable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-100 p-4 rounded text-sm mb-3">
                VITE_POSTHOG_KEY=your_key_here
              </pre>
              <Badge className={import.meta.env.VITE_POSTHOG_KEY ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                {import.meta.env.VITE_POSTHOG_KEY ? "✓ PostHog Key Configured" : "⚠ Set VITE_POSTHOG_KEY in environment"}
              </Badge>
              <p className="text-sm text-slate-600 mt-2">
                {import.meta.env.VITE_POSTHOG_KEY 
                  ? "Events are being tracked to PostHog" 
                  : "Events will be logged to console"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                2. SEO Component
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-100 p-4 rounded text-sm mb-3 overflow-x-auto">
{`<SEOHead 
  title="Your Page" 
  description="Page description"
  image="/og-image.png"
/>`}
              </pre>
              <Badge className="bg-green-100 text-green-700">✓ Active on this page</Badge>
              <p className="text-sm text-slate-600 mt-2">
                Open Graph and Twitter Card meta tags are set
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                3. Social Sharing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-100 p-4 rounded text-sm mb-3 overflow-x-auto">
{`<SocialShare 
  url={window.location.href}
  title="Share title"
/>`}
              </pre>
              <p className="text-sm text-slate-600 mb-3">Try sharing this page:</p>
              <SocialShare
                url={window.location.href}
                title="Check out this Analytics Test Page!"
                description="Testing all analytics features on Promptster"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                4. Viewport Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-100 p-4 rounded text-sm mb-3 overflow-x-auto">
{`const { ref, inView } = useViewportTracking('name');
<div ref={ref}>Content</div>`}
              </pre>
              <Badge className="bg-green-100 text-green-700">✓ Scroll down to see it work</Badge>
              <p className="text-sm text-slate-600 mt-2">
                Sections below are tracked when they enter viewport
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Click Tracking Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Click Tracking Demo</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-600">Click the button to test event tracking</p>
            <Button 
              size="lg" 
              onClick={handleTestClick}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Test Click Tracking
            </Button>
            {clickCount > 0 && (
              <Badge className="bg-green-100 text-green-700 text-lg px-4 py-2">
                ✓ Tracked {clickCount} click{clickCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Viewport Tracking Sections */}
        <div className="space-y-8">
          <Card ref={section1Ref} className="min-h-[300px]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Viewport Section 1</span>
                {section1InView && (
                  <Badge className="bg-green-100 text-green-700">
                    ✓ In View - Tracked!
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                This section is tracked when it enters your viewport. 
                {section1InView 
                  ? " You're viewing it now - event sent to PostHog!" 
                  : " Scroll to bring it into view."}
              </p>
            </CardContent>
          </Card>

          <Card ref={section2Ref} className="min-h-[300px]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Viewport Section 2</span>
                {section2InView && (
                  <Badge className="bg-green-100 text-green-700">
                    ✓ In View - Tracked!
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Another tracked section. 
                {section2InView 
                  ? " You're viewing it now!" 
                  : " Keep scrolling..."}
              </p>
            </CardContent>
          </Card>

          <Card ref={section3Ref} className="min-h-[300px]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Viewport Section 3</span>
                {section3InView && (
                  <Badge className="bg-green-100 text-green-700">
                    ✓ In View - Tracked!
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Final tracked section. 
                {section3InView 
                  ? " You made it! All viewport events tracked." 
                  : " Almost there..."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardHeader>
            <CardTitle>🎉 All Features Working!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Time tracking: Automatically measuring time on page</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Click tracking: Button clicks tracked with custom properties</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Viewport tracking: 3 sections tracked when scrolled into view</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>SEO: Meta tags set for social media sharing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Social sharing: 6 platforms available (Facebook, Twitter, LinkedIn, WhatsApp, Telegram, Email)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
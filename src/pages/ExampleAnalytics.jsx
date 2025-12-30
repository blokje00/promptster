import React from 'react';
import { SEOHead } from '@/components/shared/SEOHead';
import { SocialShare } from '@/components/shared/SocialShare';
import { useViewportTracking, useTimeTracking, useClickTracking } from '@/components/hooks/useAnalytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ExampleAnalyticsPage() {
  useTimeTracking('example_page');
  const { trackClick } = useClickTracking();
  const { ref: heroRef, inView: heroInView } = useViewportTracking('hero_section');
  const { ref: ctaRef, inView: ctaInView } = useViewportTracking('cta_section');

  const handleCTAClick = () => {
    trackClick('main_cta', { location: 'hero' });
  };

  return (
    <>
      <SEOHead
        title="Analytics Example"
        description="See how analytics and social sharing work in action"
        keywords={['analytics', 'tracking', 'social media']}
        image="/example-og-image.png"
      />

      <div className="container mx-auto py-8 space-y-12">
        {/* Hero Section */}
        <section ref={heroRef} className="text-center space-y-4">
          <h1 className="text-4xl font-bold">
            Analytics & Social Sharing Demo
          </h1>
          <p className="text-slate-600 text-lg">
            This page demonstrates all installed libraries
          </p>
          {heroInView && (
            <p className="text-sm text-green-600">
              ✓ Hero section viewed - tracked!
            </p>
          )}
        </section>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>📊 PostHog Analytics</CardTitle>
              <CardDescription>Automatic event tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Events automatically tracked:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Page views</li>
                <li>Button clicks</li>
                <li>Time on page</li>
                <li>Element visibility</li>
                <li>Custom events</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🔍 SEO & Meta Tags</CardTitle>
              <CardDescription>react-helmet-async</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Dynamic meta tags for:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Open Graph (Facebook)</li>
                <li>Twitter Cards</li>
                <li>Page titles</li>
                <li>Descriptions</li>
                <li>Canonical URLs</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📱 Social Sharing</CardTitle>
              <CardDescription>react-share</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Share on social media:</p>
              <SocialShare
                url={window.location.href}
                title="Check out Promptster!"
                description="AI-powered prompt management platform"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>👁️ Viewport Tracking</CardTitle>
              <CardDescription>react-intersection-observer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Track when users see content:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Scroll depth</li>
                <li>Element visibility</li>
                <li>Content engagement</li>
                <li>A/B test exposure</li>
              </ul>
            </CardContent>
          </Card>
      </div>

      {/* CTA Section */}
      <section ref={ctaRef} className="text-center space-y-6 py-12">
        <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
        <p className="text-slate-600">
          Click below to see click tracking in action
        </p>
        <Button size="lg" onClick={handleCTAClick}>
          Track This Click
        </Button>
        {ctaInView && (
          <p className="text-sm text-green-600">
            ✓ CTA section viewed - tracked!
          </p>
        )}
      </section>

      {/* Usage Instructions */}
      <Card>
          <CardHeader>
            <CardTitle>🚀 How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Add environment variable:</h3>
              <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
                VITE_POSTHOG_KEY=your_posthog_project_api_key
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Use SEO component in pages:</h3>
              <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`<SEOHead 
  title="Your Page" 
  description="Page description"
  image="/og-image.png"
/>`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Add social sharing:</h3>
              <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`<SocialShare 
  url={window.location.href}
  title="Share title"
/>`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. Track viewport visibility:</h3>
              <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`const { ref, inView } = useViewportTracking('section_name');
<div ref={ref}>Content</div>`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
# 📊 Analytics & Social Media Setup Guide

## ✅ Geïnstalleerde Libraries

1. **posthog-js** - Complete product analytics & session recording
2. **react-helmet-async** - SEO & social media meta tags
3. **react-share** - Social media share buttons
4. **react-intersection-observer** - Viewport & scroll tracking

## 🚀 Quick Start

### 1. PostHog Analytics Setup

1. Maak gratis account: [https://posthog.com](https://posthog.com)
2. Kopieer je Project API Key
3. Voeg toe aan `.env`:
   ```
   VITE_POSTHOG_KEY=phc_your_key_here
   ```

**Automatisch getrackt:**
- Page views
- Button clicks (via useClickTracking hook)
- Time on page (via useTimeTracking hook)
- Element visibility (via useViewportTracking hook)

### 2. SEO Meta Tags

Voeg `<SEOHead>` toe aan elke pagina:

```jsx
import { SEOHead } from '@/components/shared/SEOHead';

function YourPage() {
  return (
    <>
      <SEOHead
        title="Pagina Titel"
        description="Beschrijving voor zoekmachines en social media"
        image="/og-image.png"
        keywords={['keyword1', 'keyword2']}
      />
      {/* rest van je pagina */}
    </>
  );
}
```

**Automatisch gegenereerd:**
- Open Graph tags (Facebook, LinkedIn)
- Twitter Cards
- Canonical URLs
- Meta descriptions

### 3. Social Media Sharing

Voeg share buttons toe:

```jsx
import { SocialShare } from '@/components/shared/SocialShare';

<SocialShare
  url={window.location.href}
  title="Check dit uit!"
  description="Beschrijving voor shares"
  iconSize={32}
/>
```

**Ondersteunde platforms:**
- Facebook
- Twitter/X
- LinkedIn
- WhatsApp
- Telegram
- Email

### 4. Viewport Tracking

Track wanneer gebruikers content zien:

```jsx
import { useViewportTracking } from '@/hooks/useAnalytics';

function YourComponent() {
  const { ref, inView } = useViewportTracking('component_name');
  
  return (
    <div ref={ref}>
      {inView && <p>Gebruiker heeft dit gezien! ✓</p>}
    </div>
  );
}
```

## 📁 Aangemaakte Files

```
src/
├── lib/
│   └── analytics.js              # PostHog configuratie & helpers
├── components/
│   └── shared/
│       ├── SEOHead.jsx           # SEO meta tags component
│       └── SocialShare.jsx       # Social share buttons
├── hooks/
│   └── useAnalytics.js          # Analytics hooks
└── pages/
    └── ExampleAnalytics.jsx     # Demo pagina met voorbeelden
```

## 🎯 Gebruik in Bestaande Paginas

### Dashboard toevoegen aan routes:

```jsx
// In je router config
import ExampleAnalytics from '@/pages/ExampleAnalytics';

// Voeg route toe
{
  path: '/analytics-demo',
  element: <ExampleAnalytics />
}
```

### Voorbeeld: Track button click

```jsx
import { useClickTracking } from '@/hooks/useAnalytics';

function MyComponent() {
  const { trackClick } = useClickTracking();
  
  const handleSubmit = () => {
    trackClick('submit_form', { form: 'contact' });
    // rest van je logica
  };
  
  return <button onClick={handleSubmit}>Submit</button>;
}
```

### Voorbeeld: Track time on page

```jsx
import { useTimeTracking } from '@/hooks/useAnalytics';

function MyPage() {
  useTimeTracking('my_page');
  // Tijd wordt automatisch getrackt bij unmount
  
  return <div>Content</div>;
}
```

### Voorbeeld: Custom event

```jsx
import { trackEvent } from '@/lib/analytics';

// Ergens in je code
trackEvent('custom_event', {
  property1: 'value1',
  property2: 'value2'
});
```

## 🎨 Open Graph Images

Maak een OG image (1200x630px) voor social shares:

```
public/
├── og-image.png          # Default voor hele site
└── pages/
    └── product-og.png    # Specifiek per pagina
```

## 📊 PostHog Dashboard

Na setup zie je in PostHog:
- **Insights**: Custom dashboards met metrics
- **Events**: Alle getrackte events live
- **Session Recordings**: Video's van gebruikerssessies
- **Feature Flags**: A/B testing
- **Funnels**: Conversion tracking

## 🔥 Volgende Stappen

1. **Voeg SEOHead toe aan alle belangrijke paginas**
2. **Plaats SocialShare op product/artikel paginas**
3. **Track belangrijke CTA buttons met useClickTracking**
4. **Monitor scroll depth met useViewportTracking**
5. **Bekijk PostHog dashboard voor insights**

## 💡 Marketing Tips

### Voor Viraal Gaan:
- Voeg achievement sharing toe (zie canvas-confetti die je al hebt!)
- Track welke content het meest gedeeld wordt
- A/B test verschillende share teksten

### Voor Conversie:
- Track funnel: homepage → signup → first action
- Monitor waar gebruikers afhaken (session recordings)
- Test verschillende CTA posities

### Voor Retention:
- Track welke features het meest gebruikt worden
- Identificeer power users
- Monitor terugkerende bezoeken

## 🆘 Troubleshooting

**PostHog werkt niet:**
- Check console voor errors
- Verifieer VITE_POSTHOG_KEY in .env
- Check of domain toegestaan is in PostHog settings

**Social sharing images niet zichtbaar:**
- Verifieer absolute URL (https://)
- Test met [Open Graph Debugger](https://developers.facebook.com/tools/debug/)
- Clear cache op social platforms

**Analytics events niet zichtbaar:**
- Check of PostHog geïnitialiseerd is (see console)
- Verifieer network tab voor POST requests
- Check ad blockers

## 📖 Documentatie

- [PostHog Docs](https://posthog.com/docs)
- [React Helmet Async](https://github.com/staylor/react-helmet-async)
- [React Share](https://github.com/nygardk/react-share)
- [React Intersection Observer](https://github.com/thebuilder/react-intersection-observer)

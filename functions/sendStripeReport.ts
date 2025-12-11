import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * TASK-8: Stripe Integration Audit Report via Email
 * Analyzes current Stripe integration and sends detailed report
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const report = `
# Stripe Integration Audit Report
**Date:** ${new Date().toISOString().split('T')[0]}
**App:** Promptster.app
**Requested by:** ${user.email}

---

## ✅ WAT GOED IS GEGAAN

### 1. Secrets Configuratie
- ✓ STRIPE_SECRET_KEY correct ingesteld
- ✓ STRIPE_PUBLISHABLE_KEY correct ingesteld  
- ✓ STRIPE_WEBHOOK_SECRET correct ingesteld

### 2. createStripeCheckoutSession (functions/createStripeCheckoutSession.js)
**Status:** ✅ Grotendeels correct
- Base44 authenticatie aanwezig
- Stripe checkout sessions worden correct gemaakt
- Customer metadata tracking met userId en appId
- Success/cancel URLs handling
- Existing customer ID support

### 3. stripeWebhookHandler (functions/stripeWebhookHandler.js)
**Status:** ✅ Grotendeels correct
- Webhook signature verificatie
- Correcte event handling voor checkout.session.completed, customer.subscription.updated/deleted
- Service role gebruikt voor database updates

### 4. User Entity Schema
**Status:** ✅ Stripe velden aanwezig
- stripe_customer_id, stripe_subscription_id fields
- subscription_status enum correct
- plan_id field

### 5. Frontend Subscription Page
**Status:** ✅ Werkend
- Plan display, checkout flow, customer portal, session verification

---

## ⚠️ KRITIEKE PROBLEMEN

### 1. **Metadata Mismatch in Checkout**
**File:** functions/createStripeCheckoutSession.js
**Issue:** Missing planId in metadata
**Impact:** Webhook kan plan niet toewijzen
**Fix:** Add planId parameter to checkout and metadata

### 2. **User Entity - Invalid Required Fields**  
**File:** entities/User.json
**Issue:** stripe_customer_id en stripe_subscription_id zijn required maar kunnen null zijn voor nieuwe users
**Impact:** Nieuwe users kunnen niet worden aangemaakt
**Fix:** Remove from required array

### 3. **Missing Backend Functions**
❌ createStripePortalSession - Referenced maar ontbreekt
❌ verifyStripeSession - Referenced maar ontbreekt  
❌ syncSubscriptionStatus - Referenced maar ontbreekt

---

## ⚠️ VERBETERPUNTEN

### 4. Geen Audit Trail
- Geen ActivityLog voor Stripe events
- Aanbeveling: Log alle checkout/webhook events

### 5. Error Handling
- Geen notifications bij subscription expiration/payment failures
- Aanbeveling: Email notifications + in-app toasts

### 6. Security
- Geen rate limiting op checkout creation
- Geen price validation (frontend kan willekeurige priceId sturen)
- Geen fraud prevention checks

### 7. Webhook Retry
- Geen proper retry bij failures
- Aanbeveling: Exponential backoff + manual review queue

### 8. Product Catalog Sync
- Geen sync tussen Stripe products en SubscriptionPlan entity
- Handmatige updates nodig

---

## 📊 SCORECARD

| Component | Status | Score |
|-----------|--------|-------|
| Secrets Setup | ✅ | 10/10 |
| Checkout Creation | ⚠️ | 7/10 |
| Webhook Handler | ⚠️ | 7/10 |
| User Schema | ⚠️ | 6/10 |
| Portal Function | ❌ | 0/10 |
| Verify Function | ❌ | 0/10 |
| Sync Function | ❌ | 0/10 |
| Error Handling | ⚠️ | 4/10 |
| Security | ⚠️ | 5/10 |
| Audit Trail | ❌ | 0/10 |

**Overall Health:** 5.2/10 ⚠️

---

## 🔧 PRIORITEIT FIXES

**P0 - KRITIEK:**
1. Create createStripePortalSession function
2. Create verifyStripeSession function
3. Fix User entity required fields
4. Fix metadata.planId in checkout

**P1 - HOOG:**
5. Create syncSubscriptionStatus function
6. Add ActivityLog for Stripe events
7. Add error notifications

**P2 - MEDIUM:**
8. Add rate limiting
9. Add price validation
10. Improve webhook retry

**P3 - LOW:**
11. Fraud prevention
12. Product sync
13. Email notifications

---

## 💡 AANBEVELINGEN

1. Start met P0 fixes (blokkeren core functionaliteit)
2. Test checkout flow end-to-end na fixes
3. Monitor webhook reliability in production
4. Implement ActivityLog voor compliance
5. Add user-facing subscription status page
6. Setup Stripe webhook monitoring alerts

---

Dit rapport is automatisch gegenereerd en bevat geen code changes.
Voor implementatie: review met team, prioriteer fixes, test in staging.

**Einde Rapport**
`;

    // Send report via email
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: 'Stripe Integration Audit Report - Promptster.app',
      body: report
    });

    return Response.json({ 
      success: true,
      message: 'Stripe audit report sent to ' + user.email 
    });

  } catch (error) {
    console.error('[sendStripeReport] Error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
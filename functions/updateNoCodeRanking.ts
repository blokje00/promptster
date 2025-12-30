import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check if user is authenticated
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Scrape the seed URL and extract platform data
    const seedUrl = "https://top5-websitebuilders.com/best-ai-app-builders/";
    
    console.log('[updateNoCodeRanking] Fetching seed data from:', seedUrl);
    
    // Use InvokeLLM to extract structured data from the page
    const analysisResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this URL and extract information about AI/no-code app builder platforms.
      
URL: ${seedUrl}

For each platform mentioned, extract:
- Name
- Brief description
- Target users
- Pricing info (if mentioned)
- Any features or capabilities mentioned

Format your response as a JSON array of platforms with fields: name, description, target_users, pricing_notes, features.
Only include actual AI/no-code platforms (like Bubble, FlutterFlow, Softr, etc).`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          platforms: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                target_users: { type: "string" },
                pricing_notes: { type: "string" },
                features: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      }
    });

    const seedPlatforms = analysisResponse.platforms || [];
    console.log('[updateNoCodeRanking] Extracted platforms:', seedPlatforms.length);

    // Enrich each platform with detailed analysis
    const enrichedPlatforms = [];
    
    for (let i = 0; i < Math.min(seedPlatforms.length, 25); i++) {
      const platform = seedPlatforms[i];
      
      console.log(`[updateNoCodeRanking] Enriching platform ${i+1}:`, platform.name);
      
      // Use LLM to research and enrich platform data
      const enrichment = await base44.integrations.Core.InvokeLLM({
        prompt: `Research the no-code/AI platform "${platform.name}" and provide detailed market intelligence.

Analyze:
1. Current pricing (entry price, credits, model)
2. AI providers used (OpenAI, Anthropic, Google, etc)
3. Estimated user base
4. Company background (founded, country, funding)
5. Transparency (how clear is their pricing)
6. Estimated cost per 1000 AI prompts/requests
7. Any recent price changes or controversies
8. Lock-in risk (low/medium/high)

Also calculate a "Promptster ROI Score" (0-10) based on:
- How much users could save by storing/reusing prompts (Promptster's core value)
- Whether the platform has high retry costs
- Whether prompts are expensive to re-run
- Whether context management is costly

Provide structured analysis.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            entry_price_eur: { type: "number" },
            pricing_model: { type: "string" },
            included_credits: { type: "number" },
            ai_providers: { type: "array", items: { type: "string" } },
            estimated_users: { type: "number" },
            company_founded: { type: "number" },
            company_country: { type: "string" },
            founders: { type: "string" },
            funding_total: { type: "string" },
            transparency_score: { type: "number" },
            cost_per_1000_prompts: { type: "number" },
            lock_in_risk: { type: "string" },
            promptster_roi_score: { type: "number" },
            promptster_advantage: { type: "string" },
            recent_changes: { type: "string" },
            confidence_score: { type: "number" }
          }
        }
      });

      const slug = platform.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      enrichedPlatforms.push({
        rank: i + 1,
        name: platform.name,
        slug: slug,
        status: enrichment.recent_changes?.toLowerCase().includes('price') ? 'price_increase' : 'stable',
        estimated_users: enrichment.estimated_users || 10000,
        target_user_type: platform.target_users || "Developers & Makers",
        pricing_model: enrichment.pricing_model || "subscription",
        entry_price_eur: enrichment.entry_price_eur || 0,
        included_credits: enrichment.included_credits || 0,
        cost_per_1000_prompts: enrichment.cost_per_1000_prompts || 5,
        ai_providers: enrichment.ai_providers || ["OpenAI"],
        transparency_score: enrichment.transparency_score || 3,
        promptster_roi_score: enrichment.promptster_roi_score || 5,
        promptster_leverage: enrichment.promptster_advantage || "Prompt reuse and versioning",
        company_founded: enrichment.company_founded || 2020,
        company_country: enrichment.company_country || "USA",
        founders: enrichment.founders || "Unknown",
        funding_total: enrichment.funding_total || "Unknown",
        lock_in_risk: enrichment.lock_in_risk || "medium",
        promptster_advantage: enrichment.promptster_advantage || "Store and reuse expensive prompts",
        last_crawled: new Date().toISOString(),
        confidence_score: enrichment.confidence_score || 70,
        credit_burn_model: platform.pricing_notes || "Per API call",
        historical_behavior: enrichment.recent_changes || "No major changes detected"
      });
    }

    // Sort by ROI score
    enrichedPlatforms.sort((a, b) => b.promptster_roi_score - a.promptster_roi_score);
    
    // Update ranks
    enrichedPlatforms.forEach((p, i) => p.rank = i + 1);

    // Check existing platforms and detect changes
    const existingPlatforms = await base44.asServiceRole.entities.NoCodePlatform.list();
    const alerts = [];

    for (const platform of enrichedPlatforms) {
      const existing = existingPlatforms.find(p => p.slug === platform.slug);
      
      if (existing) {
        // Detect price changes
        if (existing.entry_price_eur !== platform.entry_price_eur) {
          alerts.push({
            platform_slug: platform.slug,
            alert_type: 'price_increase',
            old_value: `€${existing.entry_price_eur}`,
            new_value: `€${platform.entry_price_eur}`,
            impact_level: platform.entry_price_eur > existing.entry_price_eur ? 'high' : 'medium',
            description: `${platform.name} changed pricing from €${existing.entry_price_eur} to €${platform.entry_price_eur}`,
            mitigation: `Use Promptster to store and reuse prompts, avoiding repeated API costs`,
            affected_users: `All ${platform.name} users`,
            created_by: user.email
          });
        }
        
        // Update existing
        await base44.asServiceRole.entities.NoCodePlatform.update(existing.id, platform);
      } else {
        // Create new platform
        platform.created_by = user.email;
        await base44.asServiceRole.entities.NoCodePlatform.create(platform);
        
        alerts.push({
          platform_slug: platform.slug,
          alert_type: 'new_platform',
          new_value: platform.name,
          impact_level: 'medium',
          description: `New platform detected: ${platform.name}`,
          mitigation: `Evaluate if Promptster can help reduce costs`,
          affected_users: 'Potential new users',
          created_by: user.email
        });
      }
    }

    // Create alerts
    for (const alert of alerts) {
      await base44.asServiceRole.entities.PlatformAlert.create(alert);
    }

    return Response.json({
      success: true,
      platforms_updated: enrichedPlatforms.length,
      alerts_created: alerts.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[updateNoCodeRanking] Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});
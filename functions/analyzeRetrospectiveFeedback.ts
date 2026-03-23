import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { project_id, domain } = await req.json();

        // Haal alle feedback op voor dit project (laatste 90 dagen)
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const allFeedback = await base44.entities.PromptFeedback.filter({
            project_id: project_id || undefined
        });

        const recentFeedback = allFeedback.filter(f => {
            const createdDate = new Date(f.created_date);
            return createdDate > ninetyDaysAgo;
        });

        if (recentFeedback.length < 10) {
            return Response.json({ 
                message: 'Not enough feedback data yet (need 10+ samples)',
                count: recentFeedback.length
            });
        }

        // Groepeer feedback per rating
        const excellent = recentFeedback.filter(f => f.rating === 'excellent');
        const good = recentFeedback.filter(f => f.rating === 'good');
        const poor = recentFeedback.filter(f => f.rating === 'poor' || f.rating === 'okay');

        if (excellent.length < 5 || poor.length < 2) {
            return Response.json({
                message: 'Need more diverse feedback (5+ excellent, 2+ poor)',
                counts: { excellent: excellent.length, good: good.length, poor: poor.length }
            });
        }

        // Semantic Advantage Analyse (GRPO principe)
        const analysisPrompt = `Je bent een AI expert in retrospectieve pattern analyse voor prompt engineering.

Je krijgt twee groepen prompts:
1. SUCCESVOLLE PROMPTS (${excellent.length} samples met "excellent" rating)
2. FALENDE PROMPTS (${poor.length} samples met "poor/okay" rating)

=== SUCCESVOLLE PROMPTS ===
${excellent.slice(0, 10).map((f, idx) => `
Prompt ${idx + 1}:
- What worked: ${f.what_worked || 'N/A'}
- Prompt snippet: ${f.prompt_used?.substring(0, 300) || 'N/A'}
`).join('\n')}

=== FALENDE PROMPTS ===
${poor.slice(0, 5).map((f, idx) => `
Prompt ${idx + 1}:
- What failed: ${f.what_failed || 'N/A'}
- Prompt snippet: ${f.prompt_used?.substring(0, 300) || 'N/A'}
`).join('\n')}

TAAK: Voer een **SEMANTIC ADVANTAGE** analyse uit (Training-Free GRPO principe).

Beantwoord:
1. Welke strategieën hebben de succesvolle prompts gemeen die de falende prompts NIET hebben?
2. Welke anti-patterns zie je in de falende prompts?
3. Wat zijn de 3-5 belangrijkste lessen voor toekomstige prompts?

Focus op ACTIONABLE verschillen - geen generieke adviezen.
Wees specifiek over wat WERKTE vs wat NIET werkte.`;

        const llmResponse = await base44.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    success_strategies: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                strategy: { type: "string" },
                                evidence: { type: "string" },
                                domain: { type: "string", enum: ["UI", "Data", "Logic", "All"] }
                            }
                        }
                    },
                    anti_patterns: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                pattern: { type: "string" },
                                why_it_fails: { type: "string" }
                            }
                        }
                    },
                    key_lessons: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        // Sla learned patterns op
        const savedPatterns = [];

        // Success strategies als positive patterns
        for (const strategy of llmResponse.success_strategies) {
            const pattern = await base44.entities.LearnedPattern.create({
                project_id: project_id || null,
                pattern_type: 'retrospective',
                domain: strategy.domain,
                pattern_text: `✅ **SUCCESS STRATEGY**: ${strategy.strategy}\n\n${strategy.evidence}`,
                success_rate: Math.round((excellent.length / recentFeedback.length) * 100),
                sample_size: recentFeedback.length,
                confidence: excellent.length >= 10 ? 'high' : 'medium',
                learned_from_feedback_ids: excellent.map(f => f.id)
            });
            savedPatterns.push(pattern);
        }

        // Anti-patterns als negative patterns
        for (const antiPattern of llmResponse.anti_patterns) {
            const pattern = await base44.entities.LearnedPattern.create({
                project_id: project_id || null,
                pattern_type: 'retrospective',
                domain: 'All',
                pattern_text: `❌ **ANTI-PATTERN**: ${antiPattern.pattern}\n\nWhy it fails: ${antiPattern.why_it_fails}`,
                success_rate: Math.round((poor.length / recentFeedback.length) * 100),
                sample_size: poor.length,
                confidence: poor.length >= 5 ? 'high' : 'medium',
                learned_from_feedback_ids: poor.map(f => f.id),
                is_active: false // Anti-patterns niet actief toepassen, alleen tonen
            });
            savedPatterns.push(pattern);
        }

        return Response.json({
            success: true,
            analysis: {
                total_feedback: recentFeedback.length,
                excellent: excellent.length,
                poor: poor.length,
                success_strategies: llmResponse.success_strategies.length,
                anti_patterns: llmResponse.anti_patterns.length
            },
            patterns: savedPatterns,
            key_lessons: llmResponse.key_lessons
        });

    } catch (error) {
        console.error('Retrospective analysis error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});
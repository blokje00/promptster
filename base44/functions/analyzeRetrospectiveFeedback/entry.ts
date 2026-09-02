import { withAuth, ok } from '../utils/http/entry.ts';
import { invokeLLM } from '../utils/nousLLM/entry.ts';
import { retrospectiveFeedbackPrompt, retrospectiveFeedbackSchema } from '../utils/prompts/entry.ts';

Deno.serve(withAuth({ name: 'analyzeRetrospectiveFeedback' }, async ({ base44, body }) => {
    const { project_id } = body || {};

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
        return ok({
            message: 'Not enough feedback data yet (need 10+ samples)',
            count: recentFeedback.length
        });
    }

    // Groepeer feedback per rating
    const excellent = recentFeedback.filter(f => f.rating === 'excellent');
    const good = recentFeedback.filter(f => f.rating === 'good');
    const poor = recentFeedback.filter(f => f.rating === 'poor' || f.rating === 'okay');

    if (excellent.length < 5 || poor.length < 2) {
        return ok({
            message: 'Need more diverse feedback (5+ excellent, 2+ poor)',
            counts: { excellent: excellent.length, good: good.length, poor: poor.length }
        });
    }

    // Semantic Advantage Analyse (GRPO principe)
    const analysisPrompt = retrospectiveFeedbackPrompt({ excellent, poor });

    const llmResponse = await invokeLLM({
        prompt: analysisPrompt,
        response_json_schema: retrospectiveFeedbackSchema
    });

    const successStrategies = Array.isArray(llmResponse.success_strategies) ? llmResponse.success_strategies : [];
    const antiPatterns = Array.isArray(llmResponse.anti_patterns) ? llmResponse.anti_patterns : [];
    const keyLessons = Array.isArray(llmResponse.key_lessons) ? llmResponse.key_lessons : [];

    // Sla learned patterns op — beide groepen parallel, maar success strategies
    // blijven vóór anti-patterns staan in het resultaat.
    const [successPatterns, antiPatternRecords] = await Promise.all([
        Promise.all(successStrategies.map(strategy => base44.entities.LearnedPattern.create({
            project_id: project_id || null,
            pattern_type: 'retrospective',
            domain: strategy.domain,
            pattern_text: `✅ **SUCCESS STRATEGY**: ${strategy.strategy}\n\n${strategy.evidence}`,
            success_rate: Math.round((excellent.length / recentFeedback.length) * 100),
            sample_size: recentFeedback.length,
            confidence: excellent.length >= 10 ? 'high' : 'medium',
            learned_from_feedback_ids: excellent.map(f => f.id)
        }))),
        Promise.all(antiPatterns.map(antiPattern => base44.entities.LearnedPattern.create({
            project_id: project_id || null,
            pattern_type: 'retrospective',
            domain: 'All',
            pattern_text: `❌ **ANTI-PATTERN**: ${antiPattern.pattern}\n\nWhy it fails: ${antiPattern.why_it_fails}`,
            success_rate: Math.round((poor.length / recentFeedback.length) * 100),
            sample_size: poor.length,
            confidence: poor.length >= 5 ? 'high' : 'medium',
            learned_from_feedback_ids: poor.map(f => f.id),
            is_active: false // Anti-patterns niet actief toepassen, alleen tonen
        }))),
    ]);

    const savedPatterns = [...successPatterns, ...antiPatternRecords];

    return ok({
        success: true,
        analysis: {
            total_feedback: recentFeedback.length,
            excellent: excellent.length,
            poor: poor.length,
            success_strategies: successStrategies.length,
            anti_patterns: antiPatterns.length
        },
        patterns: savedPatterns,
        key_lessons: keyLessons
    });
}));

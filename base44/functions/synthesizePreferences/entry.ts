import { withAuth, ok, fail } from '../utils/http/entry.ts';
import { invokeLLM } from '../utils/nousLLM/entry.ts';
import { synthesizePreferencesPrompt, synthesizePreferencesSchema } from '../utils/prompts/entry.ts';

Deno.serve(withAuth({ name: 'synthesizePreferences' }, async ({ base44, body }) => {
    const { project_id } = body || {};

    if (!project_id) {
        return fail('project_id is required', 400);
    }

    // Haal recent excellent feedback op voor dit project
    const allFeedback = await base44.entities.PromptFeedback.filter({
        project_id,
        rating: 'excellent'
    });

    // Filter alleen feedback van laatste 30 dagen
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentFeedback = allFeedback.filter(f => {
        const createdDate = new Date(f.created_date);
        return createdDate > thirtyDaysAgo;
    });

    if (recentFeedback.length < 3) {
        return ok({
            message: 'Not enough excellent feedback yet (need 3+)',
            count: recentFeedback.length
        });
    }

    // Haal project details op
    const project = await base44.entities.Project.get(project_id);

    // Prepareer feedback voor analyse
    const feedbackSummary = recentFeedback.map(f => ({
        prompt_used: f.prompt_used?.substring(0, 500) || 'N/A',
        what_worked: f.what_worked || 'N/A',
        notes: f.notes || 'N/A'
    }));

    // LLM analyse voor pattern synthesis
    const analysisPrompt = synthesizePreferencesPrompt({
        projectName: project.name,
        isConfigured: !!project.technical_config_markdown,
        feedbackCount: recentFeedback.length,
        feedbackSummary
    });

    const llmResponse = await invokeLLM({
        prompt: analysisPrompt,
        response_json_schema: synthesizePreferencesSchema
    });

    const patterns = Array.isArray(llmResponse.patterns) ? llmResponse.patterns : [];

    // Sla learned patterns op
    const savedPatterns = await Promise.all(patterns.map(pattern => base44.entities.LearnedPattern.create({
        project_id,
        pattern_type: 'preference_synthesis',
        domain: pattern.domain,
        pattern_text: `**${pattern.title}**\n${pattern.description}`,
        success_rate: 85, // Geschat obv excellent ratings
        sample_size: recentFeedback.length,
        confidence: pattern.confidence,
        learned_from_feedback_ids: recentFeedback.map(f => f.id)
    })));

    // Update project preferences met overall insight
    const currentPrefs = project.technical_config_markdown || '';
    const newPrefs = `${currentPrefs}\n\n## 🧠 AI Learned Patterns (${new Date().toLocaleDateString()})\n${llmResponse.overall_insight}\n\n${patterns.map(p => `- **${p.title}**: ${p.description}`).join('\n')}`;

    await base44.entities.Project.update(project_id, {
        technical_config_markdown: newPrefs
    });

    return ok({
        success: true,
        patterns_count: savedPatterns.length,
        patterns: savedPatterns,
        overall_insight: llmResponse.overall_insight
    });
}));

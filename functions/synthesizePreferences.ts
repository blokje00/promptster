import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { project_id } = await req.json();

        if (!project_id) {
            return Response.json({ error: 'project_id is required' }, { status: 400 });
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
            return Response.json({ 
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
        const analysisPrompt = `Je bent een AI expert in prompt engineering pattern recognition.

Project: ${project.name}
Platform: ${project.technical_config_markdown ? 'Configured' : 'Generic'}

Analyseer deze ${recentFeedback.length} EXCELLENTE prompts en hun feedback:

${feedbackSummary.map((f, idx) => `
=== Excellent Prompt ${idx + 1} ===
Prompt snippet: ${f.prompt_used}
What worked: ${f.what_worked}
Notes: ${f.notes}
`).join('\n')}

TAAK: Distilleer de gemeenschappelijke success patterns uit deze excellente prompts.

Focus op:
1. Welke prompt structures werkten goed?
2. Welke context-inclusie strategieën waren succesvol?
3. Welke task formuleringen leidden tot goede resultaten?
4. Welke technische details waren cruciaal?

Geef 3-5 ACTIONABLE patterns die toekomstige prompts kunnen verbeteren.
Wees specifiek en concreet - geen vage adviezen.`;

        const llmResponse = await base44.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    patterns: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                                domain: { type: "string", enum: ["UI", "Data", "Logic", "All"] },
                                confidence: { type: "string", enum: ["low", "medium", "high"] }
                            }
                        }
                    },
                    overall_insight: { type: "string" }
                }
            }
        });

        // Sla learned patterns op
        const savedPatterns = [];
        for (const pattern of llmResponse.patterns) {
            const learnedPattern = await base44.entities.LearnedPattern.create({
                project_id,
                pattern_type: 'preference_synthesis',
                domain: pattern.domain,
                pattern_text: `**${pattern.title}**\n${pattern.description}`,
                success_rate: 85, // Geschat obv excellent ratings
                sample_size: recentFeedback.length,
                confidence: pattern.confidence,
                learned_from_feedback_ids: recentFeedback.map(f => f.id)
            });
            savedPatterns.push(learnedPattern);
        }

        // Update project preferences met overall insight
        const currentPrefs = project.technical_config_markdown || '';
        const newPrefs = `${currentPrefs}\n\n## 🧠 AI Learned Patterns (${new Date().toLocaleDateString()})\n${llmResponse.overall_insight}\n\n${llmResponse.patterns.map(p => `- **${p.title}**: ${p.description}`).join('\n')}`;

        await base44.entities.Project.update(project_id, {
            technical_config_markdown: newPrefs
        });

        return Response.json({
            success: true,
            patterns_count: savedPatterns.length,
            patterns: savedPatterns,
            overall_insight: llmResponse.overall_insight
        });

    } catch (error) {
        console.error('Preference synthesis error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});
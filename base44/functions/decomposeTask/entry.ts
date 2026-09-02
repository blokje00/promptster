import { withAuth, ok, fail } from '../utils/http/entry.ts';
import { invokeLLM } from '../utils/nousLLM/entry.ts';
import { decomposeTaskPrompt, decomposeTaskSchema } from '../utils/prompts/entry.ts';

Deno.serve(withAuth({ name: 'decomposeTask' }, async ({ base44, body }) => {
    const { task_content, project_id } = body || {};

    if (!task_content) {
        return fail('task_content is required', 400);
    }

    // Optioneel: project context ophalen
    let projectContext = '';
    if (project_id) {
        const project = await base44.entities.Project.get(project_id);
        projectContext = `Project: ${project.name}\nPlatform: ${project.technical_config_markdown?.substring(0, 200) || 'Generic'}`;
    }

    // Haal eventuele learned patterns op voor dit project
    let learnedPatterns = [];
    if (project_id) {
        learnedPatterns = await base44.entities.LearnedPattern.filter({
            project_id,
            pattern_type: 'task_decomposition',
            is_active: true
        });
    }

    const patternsContext = learnedPatterns.length > 0
        ? `\n\nLearned patterns voor task writing:\n${learnedPatterns.map(p => p.pattern_text).join('\n')}`
        : '';

    // Genereer 3 task varianten
    const decompositionPrompt = decomposeTaskPrompt({
        taskContent: task_content,
        projectContext,
        patternsContext
    });

    const llmResponse = await invokeLLM({
        prompt: decompositionPrompt,
        response_json_schema: decomposeTaskSchema
    });

    return ok({
        success: true,
        original_task: task_content,
        variants: [
            { id: 'A', ...llmResponse.variant_a },
            { id: 'B', ...llmResponse.variant_b },
            { id: 'C', ...llmResponse.variant_c }
        ],
        recommendation: llmResponse.recommendation
    });
}));

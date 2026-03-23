import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { task_content, project_id } = await req.json();

        if (!task_content) {
            return Response.json({ error: 'task_content is required' }, { status: 400 });
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
        const decompositionPrompt = `Je bent een expert in het schrijven van duidelijke, actionable development tasks.

${projectContext}${patternsContext}

VAGE TASK: "${task_content}"

Genereer 3 VERSCHILLENDE varianten van deze task, elk met een andere aanpak:

VARIANT A: Maximaal specifiek - expliciete file paths, component names, technical details
VARIANT B: User-story oriented - wat moet bereikt worden en waarom
VARIANT C: Step-by-step instructies - concrete actiestappen

Elke variant moet:
- Duidelijk en actionable zijn
- Voldoende context bevatten
- Geen vage termen gebruiken

Output 3 complete task descriptions.`;

        const llmResponse = await base44.integrations.Core.InvokeLLM({
            prompt: decompositionPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    variant_a: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            rationale: { type: "string" }
                        }
                    },
                    variant_b: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            rationale: { type: "string" }
                        }
                    },
                    variant_c: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            rationale: { type: "string" }
                        }
                    },
                    recommendation: {
                        type: "string",
                        enum: ["A", "B", "C"]
                    }
                }
            }
        });

        return Response.json({
            success: true,
            original_task: task_content,
            variants: [
                { id: 'A', ...llmResponse.variant_a },
                { id: 'B', ...llmResponse.variant_b },
                { id: 'C', ...llmResponse.variant_c }
            ],
            recommendation: llmResponse.recommendation
        });

    } catch (error) {
        console.error('Task decomposition error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});
import { withAuth, ok, fail } from '../utils/http/entry.ts';
import { invokeLLM } from '../utils/nousLLM/entry.ts';
import { applyFeedbackPrompt } from '../utils/prompts/entry.ts';

/**
 * Self-Evolving Feedback Loop - Backend functie
 * Analyseert feedback en past Personal Preferences automatisch aan
 */

Deno.serve(withAuth({ name: 'applyFeedbackToPreferences' }, async ({ base44, user, body }) => {
    const { feedbackId } = body || {};

    if (!feedbackId) {
        return fail('Missing feedbackId', 400);
    }

    // Fetch feedback
    const feedback = await base44.entities.PromptFeedback.filter({ id: feedbackId });
    if (!feedback || feedback.length === 0) {
        return fail('Feedback not found', 404);
    }

    const feedbackItem = feedback[0];

    // Check if already applied
    if (feedbackItem.applied_to_preferences) {
        return ok({
            success: true,
            message: 'Feedback already applied',
            skipped: true
        });
    }

    // Get project info if project_id exists
    let projectContext = "";
    if (feedbackItem.project_id) {
        try {
            const projects = await base44.entities.Project.filter({ id: feedbackItem.project_id });
            if (projects.length > 0) {
                const project = projects[0];
                projectContext = `\nPROJECT: ${project.name}`;
            }
        } catch (error) {
            console.warn('[applyFeedbackToPreferences] Could not fetch project:', error?.message);
        }
    }

    // Get current preferences
    const currentPrefs = user.personal_preferences_markdown || "";

    // Generate learning summary using AI - PROJECT-AWARE
    const learningPrompt = applyFeedbackPrompt({
        projectContext,
        rating: feedbackItem.rating,
        whatWorked: feedbackItem.what_worked || "Not specified",
        whatFailed: feedbackItem.what_failed || "Not specified",
        notes: feedbackItem.notes || "None",
        currentPrefs,
        hasProject: !!feedbackItem.project_id
    });

    const learnings = await invokeLLM({
        prompt: learningPrompt
    });

    // Append learnings to preferences - organized by project
    let updatedPrefs = currentPrefs.trim();
    if (feedbackItem.project_id) {
        updatedPrefs += `\n\n## Project-Specific Learnings\n${learnings.trim()}`;
    } else {
        updatedPrefs += `\n\n## General Learnings\n${learnings.trim()}`;
    }

    // Update user preferences
    await base44.auth.updateMe({
        personal_preferences_markdown: updatedPrefs
    });

    // Mark feedback as applied
    await base44.entities.PromptFeedback.update(feedbackId, {
        applied_to_preferences: true
    });

    return ok({
        success: true,
        learnings,
        message: 'Preferences updated with feedback learnings'
    });
}));

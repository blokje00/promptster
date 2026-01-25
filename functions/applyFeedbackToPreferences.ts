import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Self-Evolving Feedback Loop - Backend functie
 * Analyseert feedback en past Personal Preferences automatisch aan
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feedbackId } = await req.json();

    if (!feedbackId) {
      return Response.json({ error: 'Missing feedbackId' }, { status: 400 });
    }

    // Fetch feedback
    const feedback = await base44.entities.PromptFeedback.filter({ id: feedbackId });
    if (!feedback || feedback.length === 0) {
      return Response.json({ error: 'Feedback not found' }, { status: 404 });
    }

    const feedbackItem = feedback[0];

    // Check if already applied
    if (feedbackItem.applied_to_preferences) {
      return Response.json({ 
        success: true, 
        message: 'Feedback already applied',
        skipped: true 
      });
    }

    // Get current preferences
    const currentPrefs = user.personal_preferences_markdown || "";

    // Generate learning summary using AI
    const learningPrompt = `Based on this user feedback about a prompt result, extract key learnings to add to their personal preferences:

FEEDBACK:
Rating: ${feedbackItem.rating}
What Worked: ${feedbackItem.what_worked || "Not specified"}
What Failed: ${feedbackItem.what_failed || "Not specified"}
Notes: ${feedbackItem.notes || "None"}

CURRENT PREFERENCES:
${currentPrefs}

TASK: Extract 2-3 SHORT bullet points of actionable learnings that should be added to their preferences. 
Focus on specific patterns, preferences, or approaches that worked or should be avoided.
Return ONLY the bullet points, no introduction.

Example output:
- Prefer detailed task breakdowns over high-level descriptions
- Avoid technical jargon when describing UI changes
- Always include specific file paths in instructions`;

    const learnings = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: learningPrompt
    });

    // Append learnings to preferences
    const updatedPrefs = currentPrefs.trim() + "\n\n## Learned from Experience\n" + learnings.trim();

    // Update user preferences
    await base44.auth.updateMe({
      personal_preferences_markdown: updatedPrefs
    });

    // Mark feedback as applied
    await base44.entities.PromptFeedback.update(feedbackId, {
      applied_to_preferences: true
    });

    return Response.json({
      success: true,
      learnings,
      message: 'Preferences updated with feedback learnings'
    });

  } catch (error) {
    console.error("Apply feedback error:", error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});
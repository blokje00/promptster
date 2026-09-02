import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock() factories are hoisted above regular declarations, so the mocks
// they reference must be created via vi.hoisted() (see src/tests/lib/screenshotAnalysis.test.js
// and src/tests/api/createEntityApi.test.jsx for the same pattern).
const { invokeLLMMock } = vi.hoisted(() => ({
  invokeLLMMock: vi.fn(),
}));
vi.mock("@/lib/nousClient", () => ({
  invokeLLM: (...args) => invokeLLMMock(...args),
}));

const { meMock, updateMeMock } = vi.hoisted(() => ({
  meMock: vi.fn(),
  updateMeMock: vi.fn(),
}));
vi.mock("@/api/auth", () => ({
  me: (...args) => meMock(...args),
  updateMe: (...args) => updateMeMock(...args),
}));

const { projectGetMock, projectUpdateMock } = vi.hoisted(() => ({
  projectGetMock: vi.fn(),
  projectUpdateMock: vi.fn(),
}));
vi.mock("@/api/projects", () => ({
  get: (...args) => projectGetMock(...args),
  update: (...args) => projectUpdateMock(...args),
}));

const { listActiveByProjectAndTypeMock, learnedPatternCreateMock } = vi.hoisted(() => ({
  listActiveByProjectAndTypeMock: vi.fn(),
  learnedPatternCreateMock: vi.fn(),
}));
vi.mock("@/api/learnedPatterns", () => ({
  listActiveByProjectAndType: (...args) => listActiveByProjectAndTypeMock(...args),
  create: (...args) => learnedPatternCreateMock(...args),
}));

const {
  listByProjectAndRatingMock,
  listByProjectOrAllMock,
  listByIdMock,
  promptFeedbackUpdateMock,
} = vi.hoisted(() => ({
  listByProjectAndRatingMock: vi.fn(),
  listByProjectOrAllMock: vi.fn(),
  listByIdMock: vi.fn(),
  promptFeedbackUpdateMock: vi.fn(),
}));
vi.mock("@/api/promptFeedback", () => ({
  listByProjectAndRating: (...args) => listByProjectAndRatingMock(...args),
  listByProjectOrAll: (...args) => listByProjectOrAllMock(...args),
  listById: (...args) => listByIdMock(...args),
  update: (...args) => promptFeedbackUpdateMock(...args),
}));

const {
  decomposeTask,
  synthesizePreferences,
  analyzeRetrospectiveFeedback,
  applyFeedbackToPreferences,
} = await import("@/lib/ai/learning");

beforeEach(() => {
  invokeLLMMock.mockReset();
  meMock.mockReset();
  updateMeMock.mockReset();
  projectGetMock.mockReset();
  projectUpdateMock.mockReset();
  listActiveByProjectAndTypeMock.mockReset();
  learnedPatternCreateMock.mockReset();
  listByProjectAndRatingMock.mockReset();
  listByProjectOrAllMock.mockReset();
  listByIdMock.mockReset();
  promptFeedbackUpdateMock.mockReset();
});

// ---------------------------------------------------------------------------
// decomposeTask
// ---------------------------------------------------------------------------

describe("decomposeTask", () => {
  it("throws when task_content is missing, without calling the LLM", async () => {
    await expect(decomposeTask({})).rejects.toThrow("task_content is required");
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });

  it("builds project + learned-pattern context and returns the backend's variant shape", async () => {
    projectGetMock.mockResolvedValueOnce({ name: "MyProj", technical_config_markdown: "React + Tailwind" });
    listActiveByProjectAndTypeMock.mockResolvedValueOnce([{ pattern_text: "Always name files in camelCase" }]);
    invokeLLMMock.mockResolvedValueOnce({
      variant_a: { title: "A title", description: "A desc", rationale: "A rationale" },
      variant_b: { title: "B title", description: "B desc", rationale: "B rationale" },
      variant_c: { title: "C title", description: "C desc", rationale: "C rationale" },
      recommendation: "B",
    });

    const result = await decomposeTask({ task_content: "Fix the bug", project_id: "proj1" });

    expect(listActiveByProjectAndTypeMock).toHaveBeenCalledWith("proj1", "task_decomposition");
    expect(result.success).toBe(true);
    expect(result.original_task).toBe("Fix the bug");
    expect(result.variants).toEqual([
      { id: "A", title: "A title", description: "A desc", rationale: "A rationale" },
      { id: "B", title: "B title", description: "B desc", rationale: "B rationale" },
      { id: "C", title: "C title", description: "C desc", rationale: "C rationale" },
    ]);
    expect(result.recommendation).toBe("B");
  });
});

// ---------------------------------------------------------------------------
// synthesizePreferences
// ---------------------------------------------------------------------------

describe("synthesizePreferences", () => {
  it("throws when project_id is missing", async () => {
    await expect(synthesizePreferences({})).rejects.toThrow("project_id is required");
  });

  it("returns the below-threshold message with fewer than 3 recent excellent feedback rows", async () => {
    const recent = new Date().toISOString();
    listByProjectAndRatingMock.mockResolvedValueOnce([
      { id: "f1", created_date: recent },
      { id: "f2", created_date: recent },
    ]);

    const result = await synthesizePreferences({ project_id: "proj1" });

    expect(result).toEqual({ message: "Not enough excellent feedback yet (need 3+)", count: 2 });
    expect(invokeLLMMock).not.toHaveBeenCalled();
    expect(learnedPatternCreateMock).not.toHaveBeenCalled();
  });

  it("saves LearnedPattern rows and appends the AI Learned Patterns section on the happy path", async () => {
    const recent = new Date().toISOString();
    listByProjectAndRatingMock.mockResolvedValueOnce([
      { id: "f1", created_date: recent, prompt_used: "p1", what_worked: "w1", notes: "n1" },
      { id: "f2", created_date: recent, prompt_used: "p2", what_worked: "w2", notes: "n2" },
      { id: "f3", created_date: recent, prompt_used: "p3", what_worked: "w3", notes: "n3" },
    ]);
    projectGetMock.mockResolvedValueOnce({ name: "MyProj", technical_config_markdown: "Existing config" });
    invokeLLMMock.mockResolvedValueOnce({
      patterns: [
        { title: "T1", description: "D1", domain: "UI", confidence: "high" },
        { title: "T2", description: "D2", domain: "Data", confidence: "medium" },
      ],
      overall_insight: "Insight text",
    });
    meMock.mockResolvedValueOnce({ email: "user@example.com" });
    learnedPatternCreateMock.mockImplementation((data) => Promise.resolve({ id: `lp-${data.domain}`, ...data }));

    const result = await synthesizePreferences({ project_id: "proj1" });

    expect(result.success).toBe(true);
    expect(result.patterns_count).toBe(2);
    expect(result.patterns).toHaveLength(2);
    expect(result.overall_insight).toBe("Insight text");

    expect(learnedPatternCreateMock).toHaveBeenCalledTimes(2);
    expect(learnedPatternCreateMock).toHaveBeenNthCalledWith(1, {
      project_id: "proj1",
      created_by: "user@example.com",
      pattern_type: "preference_synthesis",
      domain: "UI",
      pattern_text: "**T1**\nD1",
      success_rate: 85,
      sample_size: 3,
      confidence: "high",
      learned_from_feedback_ids: ["f1", "f2", "f3"],
    });

    expect(projectUpdateMock).toHaveBeenCalledTimes(1);
    const [projectId, payload] = projectUpdateMock.mock.calls[0];
    expect(projectId).toBe("proj1");
    expect(payload.technical_config_markdown).toContain("Existing config");
    expect(payload.technical_config_markdown).toContain("## 🧠 AI Learned Patterns");
    expect(payload.technical_config_markdown).toContain("Insight text");
    expect(payload.technical_config_markdown).toContain("- **T1**: D1");
    expect(payload.technical_config_markdown).toContain("- **T2**: D2");
  });
});

// ---------------------------------------------------------------------------
// analyzeRetrospectiveFeedback
// ---------------------------------------------------------------------------

describe("analyzeRetrospectiveFeedback", () => {
  it("returns the below-threshold message with fewer than 10 recent samples", async () => {
    const recent = new Date().toISOString();
    listByProjectOrAllMock.mockResolvedValueOnce([
      { id: "f1", rating: "excellent", created_date: recent },
      { id: "f2", rating: "poor", created_date: recent },
    ]);

    const result = await analyzeRetrospectiveFeedback({ project_id: "proj1" });

    expect(result).toEqual({ message: "Not enough feedback data yet (need 10+ samples)", count: 2 });
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });

  it("keeps success strategies before anti-patterns in the saved patterns list", async () => {
    const recent = new Date().toISOString();
    const excellent = Array.from({ length: 6 }, (_, i) => ({ id: `e${i}`, rating: "excellent", created_date: recent }));
    const good = Array.from({ length: 2 }, (_, i) => ({ id: `g${i}`, rating: "good", created_date: recent }));
    const poor = Array.from({ length: 2 }, (_, i) => ({ id: `p${i}`, rating: "poor", created_date: recent }));
    listByProjectOrAllMock.mockResolvedValueOnce([...excellent, ...good, ...poor]);

    invokeLLMMock.mockResolvedValueOnce({
      success_strategies: [{ strategy: "S1", evidence: "E1", domain: "UI" }],
      anti_patterns: [{ pattern: "P1", why_it_fails: "F1" }],
      key_lessons: ["L1", "L2"],
    });
    meMock.mockResolvedValueOnce({ email: "user@example.com" });
    learnedPatternCreateMock.mockImplementation((data) => Promise.resolve({ ...data }));

    const result = await analyzeRetrospectiveFeedback({ project_id: "proj1" });

    expect(result.success).toBe(true);
    expect(result.analysis).toEqual({
      total_feedback: 10,
      excellent: 6,
      poor: 2,
      success_strategies: 1,
      anti_patterns: 1,
    });
    expect(result.key_lessons).toEqual(["L1", "L2"]);

    // Success strategies must come first, anti-patterns second.
    expect(result.patterns).toHaveLength(2);
    expect(result.patterns[0].pattern_text).toContain("SUCCESS STRATEGY");
    expect(result.patterns[1].pattern_text).toContain("ANTI-PATTERN");
    expect(result.patterns[1].is_active).toBe(false);
    expect(learnedPatternCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: "user@example.com", project_id: "proj1" })
    );
  });
});

// ---------------------------------------------------------------------------
// applyFeedbackToPreferences
// ---------------------------------------------------------------------------

describe("applyFeedbackToPreferences", () => {
  it("throws when feedbackId is missing", async () => {
    await expect(applyFeedbackToPreferences({})).rejects.toThrow("Missing feedbackId");
  });

  it("throws 'Feedback not found' when no row matches", async () => {
    listByIdMock.mockResolvedValueOnce([]);
    await expect(applyFeedbackToPreferences({ feedbackId: "missing" })).rejects.toThrow("Feedback not found");
  });

  it("short-circuits with skipped: true when already applied", async () => {
    listByIdMock.mockResolvedValueOnce([{ id: "fb1", applied_to_preferences: true }]);

    const result = await applyFeedbackToPreferences({ feedbackId: "fb1" });

    expect(result).toEqual({ success: true, message: "Feedback already applied", skipped: true });
    expect(invokeLLMMock).not.toHaveBeenCalled();
    expect(updateMeMock).not.toHaveBeenCalled();
    expect(promptFeedbackUpdateMock).not.toHaveBeenCalled();
  });

  it("appends project-specific learnings, updates the user and marks the feedback applied", async () => {
    listByIdMock.mockResolvedValueOnce([{
      id: "fb2",
      applied_to_preferences: false,
      project_id: "proj1",
      rating: "good",
      what_worked: "Worked well",
      what_failed: null,
      notes: null,
    }]);
    projectGetMock.mockResolvedValueOnce({ name: "MyProj" });
    meMock.mockResolvedValueOnce({ email: "user@example.com", personal_preferences_markdown: "Existing prefs" });
    invokeLLMMock.mockResolvedValueOnce("- Learning 1\n- Learning 2");

    const result = await applyFeedbackToPreferences({ feedbackId: "fb2" });

    expect(result).toEqual({
      success: true,
      learnings: "- Learning 1\n- Learning 2",
      message: "Preferences updated with feedback learnings",
    });

    expect(updateMeMock).toHaveBeenCalledWith({
      personal_preferences_markdown: "Existing prefs\n\n## Project-Specific Learnings\n- Learning 1\n- Learning 2",
    });
    expect(promptFeedbackUpdateMock).toHaveBeenCalledWith("fb2", { applied_to_preferences: true });
  });

  it("falls back to General Learnings and keeps going when the project fetch fails", async () => {
    listByIdMock.mockResolvedValueOnce([{
      id: "fb3",
      applied_to_preferences: false,
      project_id: null,
      rating: "excellent",
      what_worked: "All good",
      what_failed: null,
      notes: null,
    }]);
    meMock.mockResolvedValueOnce({ email: "user@example.com", personal_preferences_markdown: "" });
    invokeLLMMock.mockResolvedValueOnce("- General learning");

    const result = await applyFeedbackToPreferences({ feedbackId: "fb3" });

    expect(result.success).toBe(true);
    expect(projectGetMock).not.toHaveBeenCalled();
    expect(updateMeMock).toHaveBeenCalledWith({
      personal_preferences_markdown: "\n\n## General Learnings\n- General learning",
    });
  });
});

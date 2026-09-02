import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock() factories are hoisted above regular declarations, so the mocks
// they reference must be created via vi.hoisted() (see Vitest docs and
// src/tests/api/createEntityApi.test.jsx for the same pattern).
const { invokeLLMMock, getNousConfigMock } = vi.hoisted(() => ({
  invokeLLMMock: vi.fn(),
  getNousConfigMock: vi.fn(),
}));

vi.mock("@/lib/nousClient", () => ({
  invokeLLM: (...args) => invokeLLMMock(...args),
  getNousConfig: (...args) => getNousConfigMock(...args),
}));

const { getMock, findByUrlMock, updateVisionAnalysisMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  findByUrlMock: vi.fn(),
  updateVisionAnalysisMock: vi.fn(),
}));

vi.mock("@/api/screenshotAssets", () => ({
  get: (...args) => getMock(...args),
  findByUrl: (...args) => findByUrlMock(...args),
  updateVisionAnalysis: (...args) => updateVisionAnalysisMock(...args),
}));

const {
  analyzeScreenshotVision,
  analyzeScreenshotWithCache,
  analyzeScreenshotUrl,
} = await import("@/lib/ai/screenshotAnalysis");

// Shared stub for `new Image()`: the `src` setter triggers onload/onerror on
// the next microtask, mimicking a real Image element without ever loading a
// network resource in jsdom. Behaviour per-test is controlled via imageStub.
const imageStub = { shouldError: false, width: 800, height: 600 };

class StubImage {
  set src(value) {
    this._src = value;
    if (imageStub.shouldError) {
      queueMicrotask(() => this.onerror && this.onerror(new Error("image load failed")));
    } else {
      queueMicrotask(() => {
        this.naturalWidth = imageStub.width;
        this.naturalHeight = imageStub.height;
        this.onload && this.onload();
      });
    }
  }
  get src() {
    return this._src;
  }
}

beforeEach(() => {
  invokeLLMMock.mockReset();
  getNousConfigMock.mockReset().mockReturnValue({ visionModel: "test-vision-model" });
  getMock.mockReset();
  findByUrlMock.mockReset();
  updateVisionAnalysisMock.mockReset();
  imageStub.shouldError = false;
  imageStub.width = 800;
  imageStub.height = 600;
  globalThis.Image = StubImage;
});

describe("analyzeScreenshotVision", () => {
  it("computes layoutRelations and returns the backend's success shape", async () => {
    invokeLLMMock.mockResolvedValueOnce({
      summary: "A form",
      regions: [
        { id: "r1", type: "heading", text: "Title", bbox: { x: 0, y: 0, width: 100, height: 20 } },
        { id: "r2", type: "button", text: "Submit", bbox: { x: 10, y: 30, width: 80, height: 20 } },
      ],
      semanticBlocks: [{ id: "b1", type: "form", components: ["r1", "r2"] }],
      detectedComponents: ["Button"],
      layoutPattern: "flex",
    });

    const result = await analyzeScreenshotVision({ url: "https://base44.app/shot.png" });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("vision-llm-v1");
    expect(result.sourceUrl).toBe("https://base44.app/shot.png");
    expect(result.imageUrl).toBe("https://base44.app/shot.png");
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.layoutRelations).toHaveLength(1);
    expect(result.layoutRelations[0]).toMatchObject({ fromId: "r1", toId: "r2" });
    expect(result.metadata.analysisLevel).toBe("level_4");
    expect(result.metadata.method).toBe("llm_vision");
    expect(result.metadata.model).toBe("test-vision-model");
  });

  it("falls back to 1920x1080 when the image fails to load", async () => {
    imageStub.shouldError = true;
    invokeLLMMock.mockResolvedValueOnce({ summary: "x", regions: [], semanticBlocks: [] });

    const result = await analyzeScreenshotVision({ url: "https://base44.app/broken.png" });

    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
  });

  it("resolves the image URL from a ScreenshotAsset by id", async () => {
    getMock.mockResolvedValueOnce({ id: "abc", public_url: "https://base44.app/from-id.png" });
    invokeLLMMock.mockResolvedValueOnce({ summary: "x", regions: [], semanticBlocks: [] });

    const result = await analyzeScreenshotVision({ screenshotId: "abc" });

    expect(getMock).toHaveBeenCalledWith("abc");
    expect(result.sourceUrl).toBe("https://base44.app/from-id.png");
  });

  it("throws when the LLM call fails", async () => {
    invokeLLMMock.mockRejectedValueOnce(new Error("Nous API error 500"));

    await expect(
      analyzeScreenshotVision({ url: "https://base44.app/shot.png" })
    ).rejects.toThrow("Nous API error 500");
  });
});

describe("analyzeScreenshotWithCache", () => {
  it("returns the cached shape on a cache hit without calling the LLM", async () => {
    findByUrlMock.mockResolvedValueOnce({
      id: "asset-1",
      vision_analysis: {
        mode: "vision-llm-v1",
        sourceUrl: "https://base44.app/shot.png",
        analyzedAt: new Date(Date.now() - 5000).toISOString(),
        metadata: { method: "llm_vision" },
      },
    });

    const result = await analyzeScreenshotWithCache({ screenshotUrl: "https://base44.app/shot.png" });

    expect(result.ok).toBe(true);
    expect(result.cached).toBe(true);
    expect(result.cacheAge).toBeGreaterThanOrEqual(0);
    expect(result.metadata.cached).toBe(true);
    expect(invokeLLMMock).not.toHaveBeenCalled();
    expect(updateVisionAnalysisMock).not.toHaveBeenCalled();
  });

  it("runs analysis, persists the cache payload, and returns the fresh shape on a cache miss", async () => {
    findByUrlMock.mockResolvedValueOnce({ id: "asset-2", vision_analysis: null });
    invokeLLMMock.mockResolvedValueOnce({ summary: "x", regions: [], semanticBlocks: [] });

    const result = await analyzeScreenshotWithCache({ screenshotUrl: "https://base44.app/shot.png" });

    expect(result.ok).toBe(true);
    expect(result.cached).toBe(false);
    expect(updateVisionAnalysisMock).toHaveBeenCalledTimes(1);
    const [id, payload] = updateVisionAnalysisMock.mock.calls[0];
    expect(id).toBe("asset-2");
    expect(payload.mode).toBe("vision-llm-v1");
    expect(typeof payload.analyzedAt).toBe("string");
  });

  it("does not try to persist when no ScreenshotAsset exists for the url", async () => {
    findByUrlMock.mockResolvedValueOnce(null);
    invokeLLMMock.mockResolvedValueOnce({ summary: "x", regions: [], semanticBlocks: [] });

    const result = await analyzeScreenshotWithCache({ screenshotUrl: "https://base44.app/shot.png" });

    expect(result.ok).toBe(true);
    expect(updateVisionAnalysisMock).not.toHaveBeenCalled();
  });

  it("throws without calling the LLM when screenshotUrl is missing", async () => {
    await expect(analyzeScreenshotWithCache({})).rejects.toThrow("Missing screenshotUrl");
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });

  it("propagates the error from analyzeScreenshotVision on a cache miss", async () => {
    findByUrlMock.mockResolvedValueOnce(null);
    invokeLLMMock.mockRejectedValueOnce(new Error("boom"));

    await expect(
      analyzeScreenshotWithCache({ screenshotUrl: "https://base44.app/shot.png" })
    ).rejects.toThrow("boom");
  });
});

describe("analyzeScreenshotUrl", () => {
  it("delegates to analyzeScreenshotWithCache at level full", async () => {
    findByUrlMock.mockResolvedValueOnce(null);
    invokeLLMMock.mockResolvedValueOnce({ summary: "x", regions: [], semanticBlocks: [] });

    const result = await analyzeScreenshotUrl("https://base44.app/shot.png");

    expect(findByUrlMock).toHaveBeenCalledWith("https://base44.app/shot.png");
    expect(result.cached).toBe(false);
  });
});

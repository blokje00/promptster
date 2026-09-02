import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for src/lib/adminStats.js, the client-side port of
 * base44/functions/getAdminStats/entry.ts. @/api/auth and the entity
 * modules are mocked so no network/base44 client is involved. Unlike the
 * backend (asServiceRole, all users), this can only ever see the signed-in
 * user's own rows — these tests assert the resulting shape, not multi-user
 * aggregation, since RLS makes that impossible from the browser.
 */

const {
  meMock,
  itemsListMineMock,
  projectsListMineMock,
  thoughtsListMineMock,
  screenshotsListMineMock,
  pageViewsListAllMock,
} = vi.hoisted(() => ({
  meMock: vi.fn(),
  itemsListMineMock: vi.fn(),
  projectsListMineMock: vi.fn(),
  thoughtsListMineMock: vi.fn(),
  screenshotsListMineMock: vi.fn(),
  pageViewsListAllMock: vi.fn(),
}));

vi.mock("@/api/auth", () => ({
  me: (...args) => meMock(...args),
}));
vi.mock("@/api/items", () => ({
  listMine: (...args) => itemsListMineMock(...args),
}));
vi.mock("@/api/projects", () => ({
  listMine: (...args) => projectsListMineMock(...args),
}));
vi.mock("@/api/thoughts", () => ({
  listMine: (...args) => thoughtsListMineMock(...args),
}));
vi.mock("@/api/screenshotAssets", () => ({
  listMine: (...args) => screenshotsListMineMock(...args),
}));
vi.mock("@/api/pageViews", () => ({
  listAll: (...args) => pageViewsListAllMock(...args),
}));

const { getAdminStats } = await import("@/lib/adminStats");

const baseUser = {
  id: "u1",
  email: "admin@x.com",
  full_name: "Admin",
  created_date: "2026-01-01T00:00:00.000Z",
};

function setupDefaults() {
  meMock.mockResolvedValue(baseUser);
  itemsListMineMock.mockResolvedValue([]);
  projectsListMineMock.mockResolvedValue([]);
  thoughtsListMineMock.mockResolvedValue([]);
  screenshotsListMineMock.mockResolvedValue([]);
  pageViewsListAllMock.mockResolvedValue([]);
}

beforeEach(() => {
  meMock.mockReset();
  itemsListMineMock.mockReset();
  projectsListMineMock.mockReset();
  thoughtsListMineMock.mockReset();
  screenshotsListMineMock.mockReset();
  pageViewsListAllMock.mockReset();
});

describe("getAdminStats", () => {
  it("returns ok:false with no stats/users when signed out", async () => {
    meMock.mockResolvedValueOnce(null);

    const result = await getAdminStats({});

    expect(result).toEqual({ ok: false, stats: null, users: [] });
    expect(itemsListMineMock).not.toHaveBeenCalled();
  });

  it("returns the AdminStats.jsx shape with a single all-zero user row when the account has no data", async () => {
    setupDefaults();

    const result = await getAdminStats({});

    expect(result.ok).toBe(true);
    expect(result.stats).toEqual({
      totalUsers: 1,
      totalItems: 0,
      itemsBreakdown: { prompts: 0, multiprompts: 0, code: 0, snippets: 0 },
      totalThoughts: 0,
      thoughtsBreakdown: { active: 0, deleted: 0 },
      analytics: { totalViews: 0, uniqueSessions: 0, uniqueUsers: 0, avgTimePerPage: 0 },
    });
    expect(result.users).toEqual([
      {
        id: "u1",
        email: "admin@x.com",
        full_name: "Admin",
        created_date: baseUser.created_date,
        itemsCount: 0,
        projectsCount: 0,
        thoughtsCount: 0,
        screenshotsCount: 0,
        pageViewsCount: 0,
        lastActivity: null,
        checks: { total: 0, success: 0, failed: 0, retried: 0 },
      },
    ]);
  });

  it("counts items by type, thoughts active/deleted, task_checks status, and picks the latest lastActivity", async () => {
    setupDefaults();
    itemsListMineMock.mockResolvedValueOnce([
      {
        id: "i1",
        type: "prompt",
        created_date: "2026-01-05T00:00:00.000Z",
        task_checks: [{ status: "success" }, { status: "failed" }],
      },
      { id: "i2", type: "multiprompt", created_date: "2026-01-06T00:00:00.000Z", task_checks: [{ status: "retried" }] },
      { id: "i3", type: "code", created_date: "2026-01-04T00:00:00.000Z" },
    ]);
    thoughtsListMineMock.mockResolvedValueOnce([
      { id: "t1", is_deleted: false, created_date: "2026-01-02T00:00:00.000Z" },
      { id: "t2", is_deleted: true, created_date: "2026-01-03T00:00:00.000Z" },
    ]);

    const result = await getAdminStats({});

    expect(result.stats.itemsBreakdown).toEqual({ prompts: 1, multiprompts: 1, code: 1, snippets: 0 });
    expect(result.stats.thoughtsBreakdown).toEqual({ active: 1, deleted: 1 });
    expect(result.users[0].checks).toEqual({ total: 3, success: 1, failed: 1, retried: 1 });
    expect(result.users[0].lastActivity).toBe("2026-01-06T00:00:00.000Z");
  });

  it("filters page views by the from/to date range and aggregates analytics", async () => {
    setupDefaults();
    pageViewsListAllMock.mockResolvedValueOnce([
      { session_id: "s1", user_id: "u1", time_on_page: 10, created_date: "2026-01-01T00:00:00.000Z" }, // before range
      { session_id: "s2", user_id: "u1", time_on_page: 20, created_date: "2026-01-15T00:00:00.000Z" },
      { session_id: "s3", user_id: null, time_on_page: 30, created_date: "2026-01-20T00:00:00.000Z" },
    ]);

    const result = await getAdminStats({
      from: "2026-01-10T00:00:00.000Z",
      to: "2026-01-31T23:59:59.999Z",
    });

    expect(result.stats.analytics.totalViews).toBe(2);
    expect(result.stats.analytics.uniqueSessions).toBe(2);
    expect(result.stats.analytics.uniqueUsers).toBe(1);
    expect(result.stats.analytics.avgTimePerPage).toBe(25);
    expect(result.users[0].pageViewsCount).toBe(2);
  });

  it("does not filter page views when no date range is given", async () => {
    setupDefaults();
    pageViewsListAllMock.mockResolvedValueOnce([
      { session_id: "s1", created_date: "2020-01-01T00:00:00.000Z", time_on_page: 5 },
    ]);

    const result = await getAdminStats({});

    expect(result.stats.analytics.totalViews).toBe(1);
  });
});

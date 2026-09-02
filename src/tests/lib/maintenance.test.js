import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for src/lib/maintenance.js, the client-side port of
 * base44/functions/fixVaultTasks/entry.ts and
 * base44/functions/hardDeleteOldTasks/entry.ts. @/api/auth and the entity
 * modules are mocked so no network/base44 client is involved.
 */

// vi.mock() factories are hoisted above regular declarations, so the mocks
// they reference must be created via vi.hoisted() (see Vitest docs).
const {
  meMock,
  listMineRecentMock,
  itemsUpdateMock,
  itemsListMineMock,
  listDeletedOlderThanMock,
  thoughtsRemoveMock,
} = vi.hoisted(() => ({
  meMock: vi.fn(),
  listMineRecentMock: vi.fn(),
  itemsUpdateMock: vi.fn(),
  itemsListMineMock: vi.fn(),
  listDeletedOlderThanMock: vi.fn(),
  thoughtsRemoveMock: vi.fn(),
}));

vi.mock("@/api/auth", () => ({
  me: (...args) => meMock(...args),
}));

vi.mock("@/api/items", () => ({
  listMineRecent: (...args) => listMineRecentMock(...args),
  update: (...args) => itemsUpdateMock(...args),
  listMine: (...args) => itemsListMineMock(...args),
}));

vi.mock("@/api/thoughts", () => ({
  listDeletedOlderThan: (...args) => listDeletedOlderThanMock(...args),
  remove: (...args) => thoughtsRemoveMock(...args),
}));

const { fixVaultTasks, hardDeleteOldTasks } = await import("@/lib/maintenance");

beforeEach(() => {
  meMock.mockReset();
  listMineRecentMock.mockReset();
  itemsUpdateMock.mockReset();
  itemsListMineMock.mockReset();
  listDeletedOlderThanMock.mockReset();
  thoughtsRemoveMock.mockReset();
});

describe("fixVaultTasks", () => {
  it("returns a not-signed-in error and never queries when there is no user", async () => {
    meMock.mockResolvedValueOnce(null);

    const result = await fixVaultTasks();

    expect(result).toEqual({ success: false, error: "Not signed in" });
    expect(listMineRecentMock).not.toHaveBeenCalled();
  });

  it("reports 0 updates for an empty vault", async () => {
    meMock.mockResolvedValueOnce({ email: "a@b.com" });
    listMineRecentMock.mockResolvedValueOnce([]);

    const result = await fixVaultTasks();

    expect(result).toEqual({ success: true, message: "Updated 0 items.", errors: undefined });
    expect(itemsUpdateMock).not.toHaveBeenCalled();
  });

  it("marks non-success checks as success, flips item status, and skips items already done", async () => {
    meMock.mockResolvedValueOnce({ email: "a@b.com" });
    listMineRecentMock.mockResolvedValueOnce([
      { id: "1", status: "open", task_checks: [{ task_name: "t1", status: "open" }] },
      { id: "2", status: "success", task_checks: [{ task_name: "t2", status: "success", is_checked: true }] },
      { id: "3", status: "open", task_checks: [] },
    ]);
    itemsUpdateMock.mockResolvedValue({});

    const result = await fixVaultTasks();

    expect(itemsUpdateMock).toHaveBeenCalledTimes(1);
    expect(itemsUpdateMock).toHaveBeenCalledWith("1", {
      task_checks: [{ task_name: "t1", status: "success", is_checked: true }],
      status: "success",
    });
    expect(result).toEqual({ success: true, message: "Updated 1 items.", errors: undefined });
  });

  it("collects per-item errors without aborting the rest of the batch", async () => {
    meMock.mockResolvedValueOnce({ email: "a@b.com" });
    listMineRecentMock.mockResolvedValueOnce([
      { id: "1", status: "open", task_checks: [{ status: "open" }] },
      { id: "2", status: "open", task_checks: [{ status: "open" }] },
    ]);
    itemsUpdateMock.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({});

    const result = await fixVaultTasks();

    expect(result.success).toBe(true);
    expect(result.message).toBe("Updated 1 items.");
    expect(result.errors).toEqual([{ id: "1", error: "boom" }]);
  });

  it("processes more than one batch of 20", async () => {
    meMock.mockResolvedValueOnce({ email: "a@b.com" });
    const many = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      status: "open",
      task_checks: [{ status: "open" }],
    }));
    listMineRecentMock.mockResolvedValueOnce(many);
    itemsUpdateMock.mockResolvedValue({});

    const result = await fixVaultTasks();

    expect(itemsUpdateMock).toHaveBeenCalledTimes(25);
    expect(result.message).toBe("Updated 25 items.");
  });
});

describe("hardDeleteOldTasks", () => {
  it("returns a not-signed-in error and never queries when there is no user", async () => {
    meMock.mockResolvedValueOnce(null);

    const result = await hardDeleteOldTasks();

    expect(result).toEqual({ success: false, error: "Not signed in" });
    expect(listDeletedOlderThanMock).not.toHaveBeenCalled();
  });

  it("reports 0/0 and skips the item cascade when there is nothing old to delete", async () => {
    meMock.mockResolvedValueOnce({ email: "a@b.com" });
    listDeletedOlderThanMock.mockResolvedValueOnce([]);

    const result = await hardDeleteOldTasks();

    expect(result).toEqual({
      success: true,
      message: "Hard deleted 0 thoughts older than 30 days. Updated 0 related items.",
      errors: undefined,
    });
    expect(itemsListMineMock).not.toHaveBeenCalled();
  });

  it("hard deletes old thoughts and strips their ids from used_thoughts", async () => {
    meMock.mockResolvedValueOnce({ email: "a@b.com" });
    listDeletedOlderThanMock.mockResolvedValueOnce([{ id: "t1" }, { id: "t2" }]);
    thoughtsRemoveMock.mockResolvedValue({});
    itemsListMineMock.mockResolvedValueOnce([
      { id: "i1", used_thoughts: ["t1", "t3"] },
      { id: "i2", used_thoughts: ["t9"] },
    ]);
    itemsUpdateMock.mockResolvedValue({});

    const result = await hardDeleteOldTasks();

    expect(thoughtsRemoveMock).toHaveBeenCalledTimes(2);
    expect(itemsUpdateMock).toHaveBeenCalledTimes(1);
    expect(itemsUpdateMock).toHaveBeenCalledWith("i1", { used_thoughts: ["t3"] });
    expect(result.message).toBe("Hard deleted 2 thoughts older than 30 days. Updated 1 related items.");
  });

  it("collects delete errors but still finishes the cascade for the ones that succeeded", async () => {
    meMock.mockResolvedValueOnce({ email: "a@b.com" });
    listDeletedOlderThanMock.mockResolvedValueOnce([{ id: "t1" }, { id: "t2" }]);
    thoughtsRemoveMock.mockRejectedValueOnce(new Error("locked")).mockResolvedValueOnce({});
    itemsListMineMock.mockResolvedValueOnce([{ id: "i1", used_thoughts: ["t2"] }]);
    itemsUpdateMock.mockResolvedValue({});

    const result = await hardDeleteOldTasks();

    expect(result.errors).toEqual([{ id: "t1", error: "locked" }]);
    expect(result.message).toBe("Hard deleted 1 thoughts older than 30 days. Updated 1 related items.");
  });
});

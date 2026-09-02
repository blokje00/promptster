import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// vi.mock() factories are hoisted above regular declarations, so the mocks
// they reference must be created via vi.hoisted() (see Vitest docs).
const { filterMock, createMock, updateMock, deleteMock } = vi.hoisted(() => ({
  filterMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}));

// In-file mock of the Base44 SDK client: only entities.Widget (generic test
// entity) and entities.Thought (used by thoughts.js) are needed here.
vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      Widget: {
        filter: (...args) => filterMock(...args),
        create: (...args) => createMock(...args),
        update: (...args) => updateMock(...args),
        delete: (...args) => deleteMock(...args),
      },
      Thought: {
        filter: (...args) => filterMock(...args),
        create: (...args) => createMock(...args),
        update: (...args) => updateMock(...args),
        delete: (...args) => deleteMock(...args),
      },
    },
  },
}));

vi.mock("@/lib/AuthContext", () => ({
  useAuth: () => ({ currentUser: { email: "t@example.com" } }),
}));

const { createEntityApi } = await import("@/api/createEntityApi");
const thoughts = await import("@/api/thoughts");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

beforeEach(() => {
  filterMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
});

describe("createEntityApi", () => {
  it("useList adds created_by and normalises a {data} envelope", async () => {
    filterMock.mockResolvedValueOnce({ data: [{ id: "1", name: "a" }] });
    const api = createEntityApi("Widget", { keyBase: "widgets" });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => api.useList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(filterMock).toHaveBeenCalledWith({ created_by: "t@example.com" });
    expect(result.current.data).toEqual([{ id: "1", name: "a" }]);
  });

  it("useList also passes a plain array response through unchanged", async () => {
    filterMock.mockResolvedValueOnce([{ id: "2" }]);
    const api = createEntityApi("Widget", { keyBase: "widgets" });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => api.useList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "2" }]);
  });

  it("listMine passes sort as the second filter() argument", async () => {
    filterMock.mockResolvedValueOnce([{ id: "3" }]);
    const api = createEntityApi("Widget", { keyBase: "widgets" });

    const result = await api.listMine("t@example.com", { sort: "-created_date" });

    expect(filterMock).toHaveBeenCalledWith({ created_by: "t@example.com" }, "-created_date");
    expect(result).toEqual([{ id: "3" }]);
  });

  it("listMine returns [] without an email and never calls filter()", async () => {
    const api = createEntityApi("Widget", { keyBase: "widgets" });

    const result = await api.listMine(undefined);

    expect(result).toEqual([]);
    expect(filterMock).not.toHaveBeenCalled();
  });

  it("useCreate invalidates the keys.all prefix on success", async () => {
    createMock.mockResolvedValueOnce({ id: "4" });
    const api = createEntityApi("Widget", { keyBase: "widgets" });
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => api.useCreate(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: "new widget" });
    });

    expect(createMock).toHaveBeenCalledWith({ name: "new widget" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["widgets"] });
  });

  it("useUpdate invalidates both keys.all and keys.one(id)", async () => {
    updateMock.mockResolvedValueOnce({ id: "5", name: "updated" });
    const api = createEntityApi("Widget", { keyBase: "widgets", oneKeyBase: "widget" });
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => api.useUpdate(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "5", data: { name: "updated" } });
    });

    expect(updateMock).toHaveBeenCalledWith("5", { name: "updated" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["widgets"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["widget", "5"] });
  });
});

describe("thoughts api", () => {
  it("softDelete sets is_deleted/deleted_at the same way useDeleteProject.jsx does", async () => {
    updateMock.mockResolvedValueOnce({ id: "6", is_deleted: true });
    const before = Date.now();

    await thoughts.softDelete("6");

    expect(updateMock).toHaveBeenCalledTimes(1);
    const [id, data] = updateMock.mock.calls[0];
    expect(id).toBe("6");
    expect(data.is_deleted).toBe(true);
    expect(typeof data.deleted_at).toBe("string");
    expect(new Date(data.deleted_at).getTime()).toBeGreaterThanOrEqual(before);
  });

  it("restore clears is_deleted/deleted_at the same way RecycleBin.jsx does", async () => {
    updateMock.mockResolvedValueOnce({ id: "7", is_deleted: false });

    await thoughts.restore("7");

    expect(updateMock).toHaveBeenCalledWith("7", { is_deleted: false, deleted_at: null });
  });
});

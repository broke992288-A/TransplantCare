import { describe, it, expect } from "vitest";

describe("pagination logic", () => {
  const PAGE_SIZE = 20;

  function paginate<T>(items: T[], page: number, pageSize: number) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize;
    return {
      data: items.slice(from, to),
      currentPage,
      totalPages,
      totalCount: items.length,
    };
  }

  const items = Array.from({ length: 55 }, (_, i) => ({ id: i + 1 }));

  it("returns correct first page", () => {
    const result = paginate(items, 1, PAGE_SIZE);
    expect(result.data.length).toBe(20);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(3);
    expect(result.data[0].id).toBe(1);
  });

  it("returns correct last page with remainder", () => {
    const result = paginate(items, 3, PAGE_SIZE);
    expect(result.data.length).toBe(15);
    expect(result.data[0].id).toBe(41);
  });

  it("clamps page to max when exceeding", () => {
    const result = paginate(items, 10, PAGE_SIZE);
    expect(result.currentPage).toBe(3);
  });

  it("handles empty dataset", () => {
    const result = paginate([], 1, PAGE_SIZE);
    expect(result.data.length).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(1);
  });

  it("handles single item", () => {
    const result = paginate([{ id: 1 }], 1, PAGE_SIZE);
    expect(result.data.length).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it("handles exact page boundary", () => {
    const exact = Array.from({ length: 40 }, (_, i) => ({ id: i + 1 }));
    const result = paginate(exact, 2, PAGE_SIZE);
    expect(result.data.length).toBe(20);
    expect(result.totalPages).toBe(2);
  });
});

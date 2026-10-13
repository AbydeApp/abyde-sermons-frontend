import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { contentService } from "@/services/content.service";
import { useDeleteContentBatch } from "./queries";

afterEach(() => vi.restoreAllMocks());

it("reports partial deletions and refreshes content once the batch finishes", async () => {
  const remove = vi.spyOn(contentService, "remove").mockImplementation(async (id) => {
    if (id === "failed") throw new Error("Cannot delete");
  });
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useDeleteContentBatch(), { wrapper });
  await act(async () => {
    const outcome = await result.current.mutateAsync(["first", "failed", "last"]);
    expect(outcome).toEqual({ deleted: ["first", "last"], failed: ["failed"] });
  });
  expect(remove).toHaveBeenCalledTimes(3);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["content"] });
  expect(invalidate.mock.calls.filter(([options]) => options?.queryKey?.[0] === "content")).toHaveLength(1);
  client.clear();
});

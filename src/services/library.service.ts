import { api } from "./api-client";
import type { AskAnswer, AskSource, LibraryFacets, Paginated, Sermon } from "@/types";

export interface LibraryParams {
  q?: string;
  speaker?: string;
  series?: string;
  scripture?: string;
  theme?: string;
  year?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export const libraryService = {
  /** Free text -> semantic search; filters only -> structured search. */
  search: (params: LibraryParams): Promise<Paginated<Sermon>> => {
    const { q, ...filters } = params;
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== ""));
    return q?.trim()
      ? api.postPage<Sermon>("/library/semantic-search", { query: q.trim(), ...clean })
      : api.postPage<Sermon>("/library/search", clean);
  },
  facets: (signal?: AbortSignal) => api.get<LibraryFacets>("/library/facets", { signal }),
  ask: async (question: string): Promise<AskAnswer> => {
    const res = await api.post<{ answer: string; sources: AskSource[] }>("/ask", { question });
    return { id: `ask-${Date.now()}`, question, answer: res.answer, sources: res.sources };
  },
};

"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { libraryService, type LibraryParams } from "@/services/library.service";

export const useLibrary = (params: LibraryParams, enabled = true) =>
  useQuery({
    enabled,
    queryKey: ["library", params],
    queryFn: () => libraryService.search(params),
    placeholderData: keepPreviousData,
  });

export const useFacets = () => useQuery({ queryKey: ["library", "facets"], queryFn: ({ signal }) => libraryService.facets(signal) });

export const useAsk = () => useMutation({ mutationFn: libraryService.ask });

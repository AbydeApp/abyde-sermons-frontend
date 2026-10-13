/** Public, non-secret configuration only. */
export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, ""),
} as const;

/** With no API URL configured the app runs against an in-browser mock backend. */
export const useMockApi = env.apiUrl === "";

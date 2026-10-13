import { api } from "./api-client";
import { contentService } from "./content.service";
import type { CalendarItem, ContentItem } from "@/types";

export const calendarService = {
  range: (from: string, to: string, signal?: AbortSignal) => api.get<CalendarItem[]>("/calendar", { params: { from, to }, signal }),
  /** Approved content without a calendar item. */
  unscheduled: async (signal?: AbortSignal): Promise<ContentItem[]> =>
    (await contentService.list({ status: "APPROVED", scheduled: false, pageSize: 50 }, signal)).items,
  create: (contentItemId: string, scheduledAt: string) => api.post<CalendarItem>("/calendar", { contentItemId, scheduledAt }),
  reschedule: (calendarItemId: string, scheduledAt: string) => api.patch<CalendarItem>(`/calendar/${calendarItemId}`, { scheduledAt }),
  remove: (calendarItemId: string) => api.delete<void>(`/calendar/${calendarItemId}`),
  /** Creates the calendar item, or moves the existing one. */
  schedule: (item: { id: string; calendarItemId?: string | null }, scheduledAt: string) =>
    item.calendarItemId ? calendarService.reschedule(item.calendarItemId, scheduledAt) : calendarService.create(item.id, scheduledAt),
};

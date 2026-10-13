import type { ContentItem, ContentType } from "@/types";

export interface ContentGroup {
  id: string;
  sermonTitle: string;
  type: ContentType;
  items: ContentItem[];
}

/** Group by IDs so sermons with the same title stay separate. */
export function groupContent(items: ContentItem[]): ContentGroup[] {
  const groups = new Map<string, ContentGroup>();
  for (const item of items) {
    const id = JSON.stringify([item.sermonId, item.type]);
    let group = groups.get(id);
    if (!group) {
      group = { id, sermonTitle: item.sermonTitle, type: item.type, items: [] };
      groups.set(id, group);
    }
    group.items.push(item);
  }
  return [...groups.values()];
}

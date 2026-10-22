import type { ComplaintMeta } from "./data.ts";

export function filterComplaintOptions(meta: ComplaintMeta, query: string, categoryId?: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matches = (...values: (string | null | undefined)[]) => {
    const text = values.join(" ").toLocaleLowerCase();
    return terms.every(term => text.includes(term));
  };
  const types = meta.types.filter(type => {
    const category = meta.categories.find(item => item.id === type.categoryId);
    return (!categoryId || type.categoryId === categoryId) &&
      matches(type.title, type.description, category?.title, category?.description);
  });
  return {
    types,
    categories: meta.categories.filter(category =>
      matches(category.title, category.description) || types.some(type => type.categoryId === category.id)),
  };
}

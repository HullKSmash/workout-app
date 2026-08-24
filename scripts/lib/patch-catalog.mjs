// Immutably set one catalog entry's video field to a URL.

export function patchCatalog(catalog, slug, field, url) {
  if (!catalog[slug]) throw new Error(`patchCatalog: unknown slug "${slug}"`);
  return { ...catalog, [slug]: { ...catalog[slug], [field]: url } };
}

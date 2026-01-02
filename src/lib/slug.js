export const slugify = (input = '') =>
  String(input)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const isValidSlug = (slug = '') => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

export const formatYear = (date = new Date()) => {
  try {
    return new Date(date).getFullYear();
  } catch {
    return new Date().getFullYear();
  }
};

export const joinNonEmpty = (...parts) =>
  parts.filter(Boolean).join(' ');

export const formatDateTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

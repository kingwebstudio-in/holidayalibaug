/** Remove control characters (keeping tab/newline), normalise whitespace edges. Output is stored as plain text and rendered escaped. */
export function cleanText(value: string, { multiline = false }: { multiline?: boolean } = {}): string {
  // eslint-disable-next-line no-control-regex
  let v = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  v = v.normalize('NFC');
  v = multiline ? v.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n') : v.replace(/\s+/g, ' ');
  return v.trim();
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

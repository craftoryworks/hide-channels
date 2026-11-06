export function normLogin(s: string): string {
  return s.trim().replace(/^@/, '').toLowerCase();
}

export function normName(s: string): string {
  return s.normalize('NFKC').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function normSlug(s: string): string {
  let v = s;
  try {
    v = decodeURIComponent(s);
  } catch {
    // keep raw value
  }
  return v.trim().toLowerCase();
}

/** Name without a trailing "(...)" part: "Grand Theft Auto V (GTA)" -> "grand theft auto v". */
export function baseName(s: string): string {
  return normName(s.replace(/\s*\([^)]*\)\s*$/, ''));
}

/** Best-effort slug guess from a typed category name ("Just Chatting" -> "just-chatting"). */
export function slugify(name: string): string {
  return normName(name)
    .replace(/&/g, 'and')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

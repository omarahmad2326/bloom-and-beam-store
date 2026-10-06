/** Dashboard → Newsletter helpers. */

type SubscriberRow = { email: string; status: string; created_at: string; source: string | null; unsubscribed_at: string | null };

const csvCell = (v: string | null | undefined) => {
  const s = v ?? '';
  // Quote, and neutralise spreadsheet formulas (=, +, -, @) in user-supplied values.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function subscribersCsv(rows: SubscriberRow[]): string {
  const header = ['email', 'status', 'signed_up', 'source', 'unsubscribed_at'];
  const lines = rows.map((r) => [r.email, r.status, r.created_at, r.source, r.unsubscribed_at].map(csvCell).join(','));
  return [header.join(','), ...lines].join('\r\n') + '\r\n';
}

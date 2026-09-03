import { isNewHost, NEW_HOST_WINDOW_DAYS } from '../hostRecency';

describe('new host marketplace window', () => {
  const now = new Date('2026-08-22T12:00:00Z');
  test('uses host approval time and includes the seven-day window', () => {
    expect(isNewHost({ hostApprovedAt: '2026-08-16T12:00:00Z' }, now)).toBe(true);
    expect(NEW_HOST_WINDOW_DAYS).toBe(7);
  });
  test('handles old or missing legacy timestamps gracefully', () => {
    expect(isNewHost({ hostApprovedAt: '2026-08-01T12:00:00Z' }, now)).toBe(false);
    expect(isNewHost({}, now)).toBe(false);
  });
  test('supports Firestore Timestamp-compatible values', () => {
    expect(isNewHost({ hostApprovedAt: { toDate: () => new Date('2026-08-20T12:00:00Z') } }, now)).toBe(true);
  });
});

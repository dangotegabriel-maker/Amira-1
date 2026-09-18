export const NEW_HOST_WINDOW_DAYS = 14;

const asDate = (value) => value?.toDate?.() || (value !== null && value !== undefined ? new Date(value) : null);

export const isNewHost = (host, now = new Date()) => {
  const approvedAt = asDate(host?.hostApprovedAt);
  return Boolean(
    approvedAt && !Number.isNaN(approvedAt.getTime()) &&
    now - approvedAt >= 0 && now - approvedAt <= NEW_HOST_WINDOW_DAYS * 86400000
  );
};

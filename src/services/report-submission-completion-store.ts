export type ReportSubmissionCompletion = {
  id: string;
  userId: string;
  ticketId: string;
  ticketNumber: string;
  completedAt: string;
};

export function mergeReportSubmissionCompletions(
  existing: ReportSubmissionCompletion[],
  incoming: ReportSubmissionCompletion[],
) {
  const byId = new Map(existing.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values()).slice(-50);
}

export function takeReportSubmissionCompletions(
  items: ReportSubmissionCompletion[],
  userId: string,
) {
  return {
    matching: items.filter((item) => item.userId === userId),
    remaining: items.filter((item) => item.userId !== userId),
  };
}

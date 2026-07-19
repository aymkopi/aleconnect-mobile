export type ComplaintSubmissionToast = {
  message: string;
  status: "success" | "danger" | "info";
};

const listeners = new Set<(toast: ComplaintSubmissionToast) => void>();

export function emitComplaintSubmissionToast(toast: ComplaintSubmissionToast) {
  listeners.forEach((listener) => listener(toast));
}

export function subscribeComplaintSubmissionToast(
  listener: (toast: ComplaintSubmissionToast) => void,
) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function phoneUrl(value: string) {
  const number = value.trim().replace(/[ ()-]/g, "");
  return /^\+?\d{3,15}$/.test(number) ? "tel:" + number : null;
}
export function websiteUrl(value: string | null | undefined) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function oncePerActivation(action: () => void) {
  let complete = false;
  return {
    run: () => {
      if (!complete) {
        complete = true;
        action();
      }
    },
    reset: () => {
      complete = false;
    },
  };
}

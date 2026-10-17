export function phoneUrl(value: string) {
  const number = value.trim().replace(/[ ()-]/g, "");
  return /^\+?\d{3,15}$/.test(number) ? "tel:" + number : null;
}
export function contactPresentation(type: string | null | undefined, label: string | null | undefined) {
  const kind = type?.trim().toLowerCase();
  const mapping = {
    mobile: { icon: "Smartphone", type: "Mobile number" },
    landline: { icon: "Phone", type: "Landline number" },
    telephone: { icon: "Phone", type: "Telephone number" },
    hotline: { icon: "PhoneCall", type: "Hotline" },
    fax: { icon: "Printer", type: "Fax number" },
  } as const;
  const contact = mapping[kind as keyof typeof mapping] ?? { icon: "ContactRound" as const, type: "Contact number" };
  const value = label?.trim();
  const redundant = /^(mobile|landline|telephone|phone|hotline(?:\s*\/\s*emergency)?|fax|other(?: service contacts)?|contact)( number)?$/i;
  return { ...contact, label: value && !redundant.test(value) ? value : null };
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

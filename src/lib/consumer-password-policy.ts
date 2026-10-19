// Keep this pure policy identical in Staff and Mobile; only the server checks breaches.
export type ConsumerPasswordRule = { id: string; label: string; met: boolean };

const common = new Set(['password', 'admin', 'administrator', 'welcome', 'qwerty', 'letmein', 'iloveyou', 'changeme', 'default', 'abc', 'test', 'guest', 'aleco', 'aleconnect']);
const normalize = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export function consumerPasswordRules(password: string, personal: readonly string[] = []): ConsumerPasswordRule[] {
  const folded = normalize(password);
  const tokens = personal.flatMap(value => {
    if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)) return [];
    const local = value.split('@')[0];
    return [normalize(local), ...local.split(/[^\p{L}\p{N}]/u).map(normalize).filter(part => part.length >= 4)]
      .filter(part => part.length >= 3);
  });
  const commonRoot = password.normalize('NFKC').trim().toLowerCase().replace(/[\d\W_]+$/g, '').replace(/@/g, 'a').replace(/0/g, 'o').replace(/\$/g, 's');
  return [
    { id: 'length', label: '8–128 characters', met: [...password.normalize('NFKC')].length >= 8 && password.length <= 128 },
    { id: 'uppercase', label: 'An uppercase letter (A–Z)', met: /[A-Z]/.test(password) },
    { id: 'lowercase', label: 'A lowercase letter (a–z)', met: /[a-z]/.test(password) },
    { id: 'number', label: 'A number (0–9)', met: /[0-9]/.test(password) },
    { id: 'special', label: 'A special character, such as ! or #', met: /[\p{P}\p{S}]/u.test(password) },
    { id: 'common', label: 'Avoid common passwords', met: !!password && !common.has(commonRoot) },
    { id: 'personal', label: 'No name, email, username or account details', met: !!password && !tokens.some(token => folded.includes(token)) },
  ];
}

export function consumerPasswordError(password: string, confirmation?: string, personal: readonly string[] = []): string | null {
  const rule = consumerPasswordRules(password, personal).find(item => !item.met);
  if (rule) return ({
    length: 'Use 8–128 characters.', uppercase: 'Add an uppercase letter (A–Z).',
    lowercase: 'Add a lowercase letter (a–z).', number: 'Add a number (0–9).',
    special: 'Add a special character, such as ! or #.', common: 'Choose a less common password.',
    personal: 'Do not include your name, email, username or account details.',
  } as Record<string, string>)[rule.id];
  if (confirmation !== undefined && password !== confirmation) return 'Both passwords must match.';
  return null;
}

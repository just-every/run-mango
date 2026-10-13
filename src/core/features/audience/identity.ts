const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function canonicalEmail(value: string | undefined) {
  if (!value) return undefined;
  const email = value.trim().toLowerCase();
  if (!emailPattern.test(email)) throw new Error('Email must be a valid address.');
  return email;
}

export function canonicalPhone(value: string | undefined) {
  if (!value) return undefined;
  const normalized = value.trim().replace(/[\s().-]/gu, '');
  if (!/^\+[1-9]\d{7,14}$/u.test(normalized)) {
    throw new Error('Phone numbers must be supplied in E.164 form, including the country calling code.');
  }
  return normalized;
}

export function destinationForChannel(channel: 'email' | 'sms', identity: { email?: string; phone?: string }) {
  const destination = channel === 'email' ? identity.email : identity.phone;
  if (!destination) throw new Error(`A ${channel} destination is required.`);
  return destination;
}

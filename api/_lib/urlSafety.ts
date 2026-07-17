import {isIP} from 'node:net';
import {promises as dns} from 'node:dns';

export const MAX_REDIRECTS = 3;

export function parsePublicHttpUrl(value: string): URL {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP(S) job URLs are allowed.');
  if (url.username || url.password) throw new Error('URLs containing credentials are not allowed.');
  if (!url.hostname || url.hostname.length > 253) throw new Error('Invalid hostname.');
  return url;
}

export function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0];
  if (isIP(normalized) === 4) {
    const parts = normalized.split('.').map(Number);
    const [a, b] = parts;
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (isIP(normalized) === 6) {
    if (normalized === '::' || normalized === '::1') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('ff')) return true;
    if (normalized.startsWith('::ffff:')) return isPrivateAddress(normalized.slice(7));
  }
  return false;
}

export async function assertPublicDestination(url: URL): Promise<void> {
  if (isIP(url.hostname) && isPrivateAddress(url.hostname)) throw new Error('Private network destinations are blocked.');
  const addresses = await dns.lookup(url.hostname, {all: true, verbatim: true});
  if (!addresses.length || addresses.some(({address}) => isPrivateAddress(address))) throw new Error('Private or unresolved destinations are blocked.');
}

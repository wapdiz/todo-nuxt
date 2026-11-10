export function getSiteName(key: string, siteUrl: string): string {
  try {
    const hostname = new URL(siteUrl).hostname;
    return hostname.replace('www.', '').replace(/\.com?|\.club|\.ru$/, '');
  } catch {
    return key.charAt(0).toUpperCase() + key.slice(1);
  }
}

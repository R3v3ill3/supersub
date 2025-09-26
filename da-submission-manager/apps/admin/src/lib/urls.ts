const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const stripLeadingSlash = (value: string) => value.replace(/^\/+/, '');

export function getWebBaseUrl(): string {
  const envUrl = (import.meta.env?.VITE_WEB_URL as string | undefined) || '';
  if (envUrl.trim().length > 0) {
    return stripTrailingSlash(envUrl.trim());
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return stripTrailingSlash(window.location.origin);
  }

  return '';
}

export function getProjectPublicUrl(slug: string | null | undefined): string {
  const baseUrl = getWebBaseUrl();
  const cleanSlug = stripLeadingSlash(String(slug ?? '').trim());
  if (!baseUrl) {
    return cleanSlug ? `/${cleanSlug}` : '';
  }
  return cleanSlug ? `${baseUrl}/${cleanSlug}` : baseUrl;
}


const DEFAULT_VIRTUAL_OFFICE_URL =
  "https://virtual-office-spacezip.replit.app/";
const DEFAULT_NEXT_LEVEL_URL = "https://joinnextlevelhq.com/portal/";

function isTrustedDestination(url: URL): boolean {
  if (url.protocol !== "https:" || url.username || url.password) {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  const isNextDomain =
    hostname === "joinnextlevelhq.com" ||
    hostname.endsWith(".joinnextlevelhq.com");
  const isReplitDeployment = hostname.endsWith(".replit.app");

  return isNextDomain || isReplitDeployment;
}

function resolveTrustedDestination(
  configuredValue: string | undefined,
  safeDefault: string,
): string {
  if (configuredValue) {
    try {
      const configuredUrl = new URL(configuredValue);
      if (isTrustedDestination(configuredUrl)) {
        return configuredUrl.href;
      }
    } catch {
      // Invalid configuration fails closed to the known-safe default.
    }
  }

  return safeDefault;
}

export const VIRTUAL_OFFICE_URL = resolveTrustedDestination(
  import.meta.env.VITE_NEXT_VIRTUAL_OFFICE_URL,
  DEFAULT_VIRTUAL_OFFICE_URL,
);

export const NEXT_LEVEL_PORTAL_URL = resolveTrustedDestination(
  import.meta.env.VITE_NEXT_LEVEL_PORTAL_URL,
  DEFAULT_NEXT_LEVEL_URL,
);
// Reads the public Blocks config from Vite env vars. Nothing here is a secret —
// the OIDC client is public (PKCE, no client_secret) per the cloud registration.

const apiUrl = import.meta.env.VITE_BLOCKS_API_URL as string | undefined;
const oidcUrl = import.meta.env.VITE_BLOCKS_OIDC_URL as string | undefined;
const oidcClientId = import.meta.env.VITE_BLOCKS_OIDC_CLIENT_ID as string | undefined;
const oidcScope = (import.meta.env.VITE_BLOCKS_OIDC_SCOPE as string | undefined) ?? "openid profile";
const xBlocksKey = import.meta.env.VITE_BLOCKS_X_BLOCKS_KEY as string | undefined;
const appDomain = import.meta.env.VITE_BLOCKS_APP_DOMAIN as string | undefined;

export const blocksConfig = {
  apiUrl: apiUrl ?? "",
  oidcUrl: oidcUrl ?? "",
  oidcClientId: oidcClientId ?? "",
  oidcScope,
  xBlocksKey: xBlocksKey ?? "",
  appDomain: appDomain ?? "",
} as const;

// The SDK needs the project key on every call. In dev, leave empty for project-less
// reads; in prod, the app domain's tenantId is the project key.
export function isLoginConfigured(): boolean {
  return Boolean(apiUrl && oidcUrl && oidcClientId);
}

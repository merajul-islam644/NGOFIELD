import { blocksClient } from "./client";

const RETURN_TO_KEY = "ngofield.returnTo";

function stashReturnTo(returnTo: string) {
  try {
    sessionStorage.setItem(RETURN_TO_KEY, returnTo);
  } catch {
    /* ignore */
  }
}

function readReturnTo(): string {
  try {
    const v = sessionStorage.getItem(RETURN_TO_KEY);
    if (v) sessionStorage.removeItem(RETURN_TO_KEY);
    return v ?? "/";
  } catch {
    return "/";
  }
}

export function loginButtonLabel(): string {
  if (!blocksClient) return "Sign in";
  return "Sign in";
}

// Click handler for the login button. Throws if config is missing — the LoginPage
// disables the button instead of letting the click fail.
export async function startLogin(returnTo: string = "/"): Promise<void> {
  if (!blocksClient) {
    throw new Error(
      "Login is not configured. Set VITE_BLOCKS_OIDC_CLIENT_ID and VITE_BLOCKS_OIDC_URL in .env.",
    );
  }
  stashReturnTo(returnTo);
  await blocksClient.auth.idp.redirectToProvider();
}

export interface CallbackResult {
  ok: boolean;
  message?: string;
  returnTo: string;
}

export async function completeLogin(callbackUrl: string): Promise<CallbackResult> {
  const returnTo = readReturnTo();
  if (!blocksClient) {
    return { ok: false, message: "Login is not configured.", returnTo };
  }
  try {
    const data = await blocksClient.auth.idp.callback(callbackUrl);
    if (data && typeof data === "object" && "error" in data && data.error) {
      return {
        ok: false,
        message: (data as { error_description?: string; error?: string }).error_description ??
          (data as { error?: string }).error ??
          "Authentication failed.",
        returnTo,
      };
    }
    return { ok: true, returnTo };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Authentication failed.",
      returnTo,
    };
  }
}

export async function fetchSessionClaims(): Promise<unknown | null> {
  if (!blocksClient) return null;
  try {
    const claims = await blocksClient.auth.userInfo();
    return claims ?? null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  if (!blocksClient) return;
  try {
    await blocksClient.auth.logout();
  } catch {
    /* best-effort */
  }
}

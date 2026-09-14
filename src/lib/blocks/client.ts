import { createBlocksClient } from "@seliseblocks/client";
import { blocksConfig } from "./config";

// One shared client for the whole app. Never hand-roll fetch/curl against Blocks.
export const blocksClient = createBlocksClient({
  apiUrl: blocksConfig.apiUrl,
  xBlocksKey: blocksConfig.xBlocksKey,
  oidc: {
    clientId: blocksConfig.oidcClientId,
    url: blocksConfig.oidcUrl,
    scope: blocksConfig.oidcScope,
    // redirectUri is derived from window.location.origin at runtime by the SDK
    // (defaults to `${origin}/login/callback`), which must match a URI registered
    // on the OIDC client for every origin this app runs on.
  },
});

import { ProviderContext, SettingsField } from "../types";

"use strict";

const DEFAULT_BASE_URL = "https://xhamster.com";
const CHECK_TIMEOUT_MS = 8000;

// The session cookie the user pasted in the settings (kvStore key
// "sessionCookie"). Empty when the user never pasted one (guest mode).
async function getSessionCookie(kvStore: any): Promise<string> {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const v = await kvStore.get("sessionCookie");
      return String(v || "").trim();
    } catch (e) {}
  }
  return "";
}

async function getBaseUrlOverride(kvStore: any): Promise<string> {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const v = await kvStore.get("baseUrlOverride");
      const clean = String(v || "").trim().replace(/\/+$/, "");
      if (clean) return clean;
    } catch (e) {}
  }
  return DEFAULT_BASE_URL;
}

/**
 * Live-checks the pasted session cookie against the site.
 * Method: GET the homepage with the cookie and look for the logged-in user
 * object ("user":{"modelName":"userModel",...,"name":"..."}).
 *   - User object present            -> logged in (name extracted too).
 *   - Full page (has videoThumbProps) but NO user object -> logged out.
 *   - Only JS shell pages (small, no video data) -> inconclusive, retry.
 * Retries shell pages up to 3 times. Every failure path returns a reason
 * instead of throwing, so the settings screen can never break because of
 * this check. (We do NOT use the /login redirect + responseURL here: in the
 * Vega sandbox axios, res.request.responseURL is undefined, so the final URL
 * cannot be read reliably. The user object in the page body is the
 * definitive marker instead.)
 */
async function checkSession(
  axios: any,
  baseUrl: string,
  cookieHeader: string
): Promise<{
  state: "working" | "logged-out" | "unknown";
  username: string;
  reason: string;
}> {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    Cookie: cookieHeader,
  };

  let sawShell = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let html = "";
    try {
      const res = await axios.get(`${baseUrl}/`, {
        headers,
        timeout: CHECK_TIMEOUT_MS,
        maxRedirects: 5,
      });
      html = res && typeof res.data === "string" ? res.data : "";
    } catch (e) {
      return {
        state: "unknown",
        username: "",
        reason: "the site did not answer the login check",
      };
    }

    const userStart = html.indexOf('"user":{"modelName":"userModel"');
    if (userStart >= 0) {
      // Logged in. The account name sits a few fields after the id
      // (id, pageURL, retired, verified, then name), so read it from a
      // small window after the object start.
      const window = html.slice(userStart, userStart + 800);
      const nameMatch = window.match(/"name":"([^"]+)"/);
      const username = nameMatch ? nameMatch[1] : "";
      return { state: "working", username, reason: "" };
    }
    // No user object. A full listing page without it means genuinely
    // logged out; a shell page (no video data) means "try again".
    if (html.includes("videoThumbProps")) {
      return {
        state: "logged-out",
        username: "",
        reason:
          "the session is logged out (the homepage loads but shows no account)",
      };
    }
    sawShell = true;
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 700 * attempt));
    }
  }

  return {
    state: "unknown",
    username: "",
    reason: sawShell
      ? "the site kept returning empty pages during the check"
      : "the site did not answer the login check",
  };
}

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  const { axios, kvStore } = providerContext;

  // --- Live cookie status line (shown at the top of the cookie field) ---
  // Never throws: any failure degrades to a "could not check" status.
  let statusLine: string;
  try {
    const cookieHeader = await getSessionCookie(kvStore);
    if (!cookieHeader) {
      statusLine =
        "Status: Not logged in — guest mode. The provider works without a cookie, but My Subscriptions will be empty. Paste a working session cookie below to log in as an account.";
    } else {
      const baseUrl = await getBaseUrlOverride(kvStore);
      const result = await checkSession(axios, baseUrl, cookieHeader);
      if (result.state === "working") {
        statusLine = result.username
          ? `Status: ✅ Working — logged in as ${result.username}. My Subscriptions will show videos.`
          : "Status: ✅ Working — logged in. My Subscriptions will show videos.";
      } else if (result.state === "logged-out") {
        statusLine = `Status: ❌ Not working — ${result.reason}. Paste a fresh working cookie below.`;
      } else {
        statusLine = `Status: ⚠️ Could not check right now (${result.reason}). The cookie may still be fine — open My Subscriptions to confirm.`;
      }
    }
  } catch (e) {
    statusLine =
      "Status: ⚠️ Could not check right now. Open My Subscriptions to confirm whether the cookie works.";
  }

  return [
    {
      key: "baseUrlOverride",
      type: "text",
      label: "Custom Domain / Mirror",
      description:
        "Default: https://xhamster.com. Override if blocked by your ISP (e.g. https://xhamster.one).",
      placeholder: "https://xhamster.com",
      defaultValue: "https://xhamster.com",
    },
    {
      key: "only3D",
      type: "toggle",
      label: "3D content only",
      description:
        "When on, searches and catalogs focus strictly on 3D, CGI, and animation content.",
      defaultValue: false,
    },
    {
      key: "sessionCookie",
      type: "text",
      label: "Account Session Cookie (Optional)",
      description: `${statusLine}\n\nPaste your logged-in XHamster session cookie to browse and stream as that account (e.g. _cfg=...; UID=...). Copy the FULL cookie string from a working cookie file — _cfg alone does not log in. Without it, the provider works as a guest.`,
      placeholder: "_cfg=your_session_cookie; UID=your_user_id",
      defaultValue: "",
    },
  ];
};

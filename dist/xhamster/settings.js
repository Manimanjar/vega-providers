// @vega-provider xhamster
// @vega-version 1.0.2
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// providers/xhamster/settings.ts
var settings_exports = {};
__export(settings_exports, {
  getSettingsSchema: () => getSettingsSchema
});
module.exports = __toCommonJS(settings_exports);
var DEFAULT_BASE_URL = "https://xhamster.com";
var CHECK_TIMEOUT_MS = 8e3;
async function getSessionCookie(kvStore) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const v = await kvStore.get("sessionCookie");
      return String(v || "").trim();
    } catch (e) {
    }
  }
  return "";
}
async function getBaseUrlOverride(kvStore) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const v = await kvStore.get("baseUrlOverride");
      const clean = String(v || "").trim().replace(/\/+$/, "");
      if (clean) return clean;
    } catch (e) {
    }
  }
  return DEFAULT_BASE_URL;
}
async function checkSession(axios, baseUrl, cookieHeader) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    Cookie: cookieHeader
  };
  let sawShell = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let html = "";
    try {
      const res = await axios.get(`${baseUrl}/`, {
        headers,
        timeout: CHECK_TIMEOUT_MS,
        maxRedirects: 5
      });
      html = res && typeof res.data === "string" ? res.data : "";
    } catch (e) {
      return {
        state: "unknown",
        username: "",
        reason: "the site did not answer the login check"
      };
    }
    const userStart = html.indexOf('"user":{"modelName":"userModel"');
    if (userStart >= 0) {
      const window = html.slice(userStart, userStart + 800);
      const nameMatch = window.match(/"name":"([^"]+)"/);
      const username = nameMatch ? nameMatch[1] : "";
      return { state: "working", username, reason: "" };
    }
    if (html.includes("videoThumbProps")) {
      return {
        state: "logged-out",
        username: "",
        reason: "the session is logged out (the homepage loads but shows no account)"
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
    reason: sawShell ? "the site kept returning empty pages during the check" : "the site did not answer the login check"
  };
}
var getSettingsSchema = async function({
  providerContext
}) {
  const { axios, kvStore } = providerContext;
  let statusLine;
  try {
    const cookieHeader = await getSessionCookie(kvStore);
    if (!cookieHeader) {
      statusLine = "Status: Not logged in \u2014 guest mode. The provider works without a cookie, but My Subscriptions will be empty. Paste a working session cookie below to log in as an account.";
    } else {
      const baseUrl = await getBaseUrlOverride(kvStore);
      const result = await checkSession(axios, baseUrl, cookieHeader);
      if (result.state === "working") {
        statusLine = result.username ? `Status: \u2705 Working \u2014 logged in as ${result.username}. My Subscriptions will show videos.` : "Status: \u2705 Working \u2014 logged in. My Subscriptions will show videos.";
      } else if (result.state === "logged-out") {
        statusLine = `Status: \u274C Not working \u2014 ${result.reason}. Paste a fresh working cookie below.`;
      } else {
        statusLine = `Status: \u26A0\uFE0F Could not check right now (${result.reason}). The cookie may still be fine \u2014 open My Subscriptions to confirm.`;
      }
    }
  } catch (e) {
    statusLine = "Status: \u26A0\uFE0F Could not check right now. Open My Subscriptions to confirm whether the cookie works.";
  }
  return [
    {
      key: "baseUrlOverride",
      type: "text",
      label: "Custom Domain / Mirror",
      description: "Default: https://xhamster.com. Override if blocked by your ISP (e.g. https://xhamster.one).",
      placeholder: "https://xhamster.com",
      defaultValue: "https://xhamster.com"
    },
    {
      key: "only3D",
      type: "toggle",
      label: "3D content only",
      description: "When on, searches and catalogs focus strictly on 3D, CGI, and animation content.",
      defaultValue: false
    },
    {
      key: "sessionCookie",
      type: "text",
      label: "Account Session Cookie (Optional)",
      description: `${statusLine}

Paste your logged-in XHamster session cookie to browse and stream as that account (e.g. _cfg=...; UID=...). Copy the FULL cookie string from a working cookie file \u2014 _cfg alone does not log in. Without it, the provider works as a guest.`,
      placeholder: "_cfg=your_session_cookie; UID=your_user_id",
      defaultValue: ""
    }
  ];
};

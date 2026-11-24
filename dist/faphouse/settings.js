// @vega-provider faphouse
// @vega-version 1.0.1
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

// providers/faphouse/settings.ts
var settings_exports = {};
__export(settings_exports, {
  getSettingsSchema: () => getSettingsSchema
});
module.exports = __toCommonJS(settings_exports);
var getSettingsSchema = async function({
  providerContext
}) {
  return [
    {
      key: "baseUrlOverride",
      type: "text",
      label: "Custom Domain / Mirror",
      description: "Default: https://faphouse2.com. Override if blocked by your ISP (e.g. https://faphouse.com).",
      placeholder: "https://faphouse2.com",
      defaultValue: "https://faphouse2.com"
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
      description: "FapHouse is a paid platform that only provides 30-60s trailers to guests. Paste your member cookie (e.g. PHPSESSID=...) to stream full videos.",
      placeholder: "PHPSESSID=your_session_cookie",
      defaultValue: ""
    }
  ];
};

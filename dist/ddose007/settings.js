// @vega-provider ddose007
// @vega-version 1.1.0
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

// providers/ddose007/settings.ts
var settings_exports = {};
__export(settings_exports, {
  settings: () => settings
});
module.exports = __toCommonJS(settings_exports);
var settings = [
  {
    key: "baseUrlOverride",
    type: "text",
    label: "Domain Override",
    description: "Override base website domain if blocked by your ISP (e.g. https://ddose007.rest)",
    placeholder: "https://ddose007.tv",
    defaultValue: "https://ddose007.tv"
  }
];

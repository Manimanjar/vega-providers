// @vega-provider xvideos
// @vega-version 2.4.0
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

// providers/xvideos/settings.ts
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
      description: "Default: https://www.xvideos.com. Override if blocked by your ISP (e.g. https://www.xvideos2.com or https://www.xvideos3.com)",
      placeholder: "https://www.xvideos.com",
      defaultValue: "https://www.xvideos.com"
    },
    {
      key: "only3D",
      type: "toggle",
      label: "3D content only",
      description: "When on, every category shows only 3D / animation videos (3D, CGI, SFM, MMD, Blender, animation and more). Videos under 2 minutes are hidden. Categories stay the same \u2014 only the content changes.",
      defaultValue: false
    }
  ];
};

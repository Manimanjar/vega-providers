// @vega-provider xvideos
// @vega-version 1.5
"use strict";

var getSettingsSchema = async function () {
  return [
    {
      key: "baseUrlOverride",
      type: "text",
      label: "Custom Domain / Mirror",
      description:
        "Default: https://www.xvideos.com. Override if blocked in your network (e.g. https://www.xvideos2.com)",
      placeholder: "https://www.xvideos.com",
      defaultValue: "https://www.xvideos.com",
    },
  ];
};

exports.getSettingsSchema = getSettingsSchema;

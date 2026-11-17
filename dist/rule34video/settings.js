// providers/rule34video/settings.ts
var getSettingsSchema = async function({
  providerContext
}) {
  return [
    {
      key: "baseUrlOverride",
      type: "text",
      label: "Custom Domain / Mirror",
      description: "Default: https://rule34video.com. Override if blocked or changed (e.g. https://rule34video.com)",
      placeholder: "https://rule34video.com",
      defaultValue: "https://rule34video.com"
    }
  ];
};
export {
  getSettingsSchema
};

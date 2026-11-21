import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "baseUrlOverride",
      type: "text",
      label: "Custom Domain / Mirror",
      description:
        "Default: https://faphouse2.com. Override if blocked by your ISP (e.g. https://faphouse.com).",
      placeholder: "https://faphouse2.com",
      defaultValue: "https://faphouse2.com",
    },
    {
      key: "only3D",
      type: "toggle",
      label: "3D content only",
      description:
        "When on, searches and catalogs focus strictly on 3D, CGI, and animation content.",
      defaultValue: false,
    },
  ];
};

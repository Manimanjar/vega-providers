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
      description: "Default: https://www.xvideos.com. Override if blocked by your ISP (e.g. https://www.xvideos2.com or https://www.xvideos3.com)",
      placeholder: "https://www.xvideos.com",
      defaultValue: "https://www.xvideos.com",
    },
  ];
};

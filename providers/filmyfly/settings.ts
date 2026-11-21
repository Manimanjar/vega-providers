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
        "Default: https://filmyfly.kred. Override if blocked or changed (e.g. https://filmyfly.info, https://filmyfly.net)",
      placeholder: "https://filmyfly.kred",
      defaultValue: "https://filmyfly.kred",
    },
  ];
};

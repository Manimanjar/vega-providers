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
        "Default: https://rule34video.com. Override if blocked or changed (e.g. https://rule34video.com)",
      placeholder: "https://rule34video.com",
      defaultValue: "https://rule34video.com",
    },
  ];
};

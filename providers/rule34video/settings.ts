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
    {
      key: "only3D",
      type: "toggle",
      label: "3D content only",
      description:
        "When on, every category shows only 3D / animation videos (3D, CGI, SFM, MMD, Blender, animation and more). Videos under 2 minutes are hidden. Categories stay the same — only the content changes.",
      defaultValue: false,
    },
  ];
};

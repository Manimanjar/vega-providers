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
        "Default: https://xhamster.com. Override if blocked by your ISP (e.g. https://xhamster.one).",
      placeholder: "https://xhamster.com",
      defaultValue: "https://xhamster.com",
    },
    {
      key: "only3D",
      type: "toggle",
      label: "3D content only",
      description:
        "When on, searches and catalogs focus strictly on 3D, CGI, and animation content.",
      defaultValue: false,
    },
    {
      key: "sessionCookie",
      type: "text",
      label: "Account Session Cookie (Optional)",
      description:
        "Paste your logged-in XHamster session cookie to browse and stream as that account (e.g. _cfg=...; UID=...). Copy it from a logged-in browser's cookies for xhamster.com. Without it, the provider works as a guest.",
      placeholder: "_cfg=your_session_cookie; UID=your_user_id",
      defaultValue: "",
    },
  ];
};

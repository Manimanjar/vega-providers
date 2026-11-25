import { SettingsField } from "../types";

export const settings: SettingsField[] = [
  {
    key: "baseUrlOverride",
    type: "text",
    label: "Domain Override",
    description:
      "Override base website domain if blocked by your ISP (e.g. https://ddose007.rest)",
    placeholder: "https://ddose007.tv",
    defaultValue: "https://ddose007.tv",
  },
];

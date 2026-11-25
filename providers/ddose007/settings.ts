import { SettingsField } from "../types";

export const settings: SettingsField[] = [
  {
    key: "baseUrlOverride",
    type: "text",
    label: "Domain Override",
    description:
      "Override base website domain if blocked by your ISP (e.g. https://instavipclub.com, https://ddose007.cc)",
    placeholder: "https://instavipclub.com",
    defaultValue: "https://instavipclub.com",
  },
];

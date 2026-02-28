import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Migration Utility",
  description: "User guide for Migration Utility",
  base: "/migration-utility/",
  srcDir: "user-guide",

  themeConfig: {
    nav: [{ text: "User Guide", link: "/" }],

    sidebar: [
      {
        text: "User Guide",
        items: [
          { text: "Getting Started", link: "/" },
          { text: "Settings", link: "/settings" },
          {
            text: "Scope",
            collapsed: false,
            items: [
              { text: "Select tables", link: "/scope/select-tables" },
              { text: "Review candidacy", link: "/scope/candidacy" },
              { text: "Configure tables", link: "/scope/table-config" },
            ],
          },
          { text: "Monitor", link: "/monitor" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/hbanerjee74/migration-utility" },
    ],

    footer: {
      message: "Migration Utility user documentation",
    },
  },
});

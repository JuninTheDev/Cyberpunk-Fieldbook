export default [
  {
    // Migration specs may seed historical document shapes through Foundry APIs when
    // those old states no longer have a supported UI creation path; this is not a
    // general exception to the Playwright lifecycle restrictions elsewhere.
    rules: {
      "no-restricted-syntax": "off",
    },
  },
];

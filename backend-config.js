/* Production backend configuration.
   Real customer data must go only to the Russian-hosted production backend.
   apiBaseUrl intentionally remains empty until the Timeweb API is deployed and verified. */
window.DERZHAVA_BACKEND_CONFIG = {
  provider: "timeweb-cloud",
  apiBaseUrl: "",
  // Future HTTPS proxy endpoint, with server-side quota and abuse protection.
  addressSuggestUrl: ""
};

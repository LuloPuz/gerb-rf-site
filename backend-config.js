/* Production backend configuration.
   Real customer data must go only to the Russian-hosted production backend.
   apiBaseUrl intentionally remains empty until the Yandex Cloud Function is deployed. */
window.DERZHAVA_BACKEND_CONFIG = {
  provider: "yandex-cloud",
  apiBaseUrl: ""
};

(() => {
  if (window.DerzhavaBackend) return;

  const TOKEN_KEY = "derzhava_admin_token_v1";
  const config = () => window.DERZHAVA_BACKEND_CONFIG || {};

  function configured() {
    const url = String(config().apiBaseUrl || "").trim();
    return /^https:\/\//i.test(url);
  }

  function baseUrl() {
    return String(config().apiBaseUrl || "").replace(/\/$/, "");
  }

  function adminToken() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }

  async function request(action, options = {}) {
    if (!configured()) throw new Error("Российская база заказов пока не подключена.");

    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (options.admin) {
      const token = adminToken();
      if (!token) throw new Error("Требуется вход администратора.");
      headers.Authorization = "Bearer " + token;
    }

    const response = await fetch(baseUrl() + "?action=" + encodeURIComponent(action), {
      method: options.method || "POST",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) sessionStorage.removeItem(TOKEN_KEY);
      throw new Error(payload?.error || "Ошибка сервера.");
    }
    return payload;
  }

  async function createOrder(order) {
    return request("create-order", {
      body: {
        customer: order.customer || {},
        items: Array.isArray(order.items) ? order.items : [],
        delivery: String(order.delivery || ""),
        comment: String(order.comment || "")
      }
    });
  }

  async function signInAdmin(email, password) {
    const result = await request("admin-login", {
      body: { email: String(email || ""), password: String(password || "") }
    });
    if (!result?.token) throw new Error("Сервер не вернул сессию администратора.");
    sessionStorage.setItem(TOKEN_KEY, result.token);
    return result;
  }

  async function getSession() {
    return adminToken() ? { token: adminToken() } : null;
  }

  async function isAdmin() {
    if (!adminToken()) return false;
    try {
      await request("admin-me", { admin: true });
      return true;
    } catch (_) {
      return false;
    }
  }

  async function signOut() {
    sessionStorage.removeItem(TOKEN_KEY);
  }

  async function listOrders() {
    const result = await request("admin-orders", { admin: true, method: "GET" });
    return Array.isArray(result?.orders) ? result.orders : [];
  }

  async function updateOrderStatus(id, status) {
    const result = await request("admin-update-status", {
      admin: true,
      body: { id, status }
    });
    return result?.order;
  }

  window.DerzhavaBackend = {
    configured,
    createOrder,
    signInAdmin,
    getSession,
    isAdmin,
    signOut,
    listOrders,
    updateOrderStatus
  };
})();

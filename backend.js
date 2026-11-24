(() => {
  if (window.DerzhavaBackend) return;

  const config = () => window.DERZHAVA_BACKEND_CONFIG || {};
  let client = null;

  function configured() {
    const cfg = config();
    return /^https:\/\/.+\.supabase\.co\/?$/i.test(String(cfg.supabaseUrl || "").trim()) &&
      String(cfg.supabasePublishableKey || "").trim().length > 20 &&
      !!window.supabase?.createClient;
  }

  function getClient() {
    if (!configured()) return null;
    if (!client) {
      const cfg = config();
      client = window.supabase.createClient(
        String(cfg.supabaseUrl).replace(/\/$/, ""),
        String(cfg.supabasePublishableKey),
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );
    }
    return client;
  }

  async function createOrder(order) {
    if (!configured()) throw new Error("База заказов пока не подключена.");
    const cfg = config();
    const response = await fetch(
      String(cfg.supabaseUrl).replace(/\/$/, "") + "/functions/v1/create-order",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": String(cfg.supabasePublishableKey)
        },
        body: JSON.stringify({
          customer: order.customer || {},
          items: Array.isArray(order.items) ? order.items : [],
          delivery: String(order.delivery || ""),
          comment: String(order.comment || "")
        })
      }
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Не удалось сохранить заказ.");
    }
    return payload;
  }

  async function signInAdmin(email, password) {
    const api = getClient();
    if (!api) throw new Error("Supabase не подключён.");
    const { data, error } = await api.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: allowed, error: roleError } = await api.rpc("is_admin");
    if (roleError || allowed !== true) {
      await api.auth.signOut();
      throw new Error("У этой учётной записи нет прав администратора.");
    }
    return data;
  }

  async function getSession() {
    const api = getClient();
    if (!api) return null;
    const { data } = await api.auth.getSession();
    return data?.session || null;
  }

  async function isAdmin() {
    const api = getClient();
    if (!api) return false;
    const { data, error } = await api.rpc("is_admin");
    return !error && data === true;
  }

  async function signOut() {
    const api = getClient();
    if (api) await api.auth.signOut();
  }

  async function listOrders() {
    const api = getClient();
    if (!api) throw new Error("Supabase не подключён.");
    const { data, error } = await api
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function updateOrderStatus(id, status) {
    const api = getClient();
    if (!api) throw new Error("Supabase не подключён.");
    const { data, error } = await api
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  window.DerzhavaBackend = {
    configured,
    getClient,
    createOrder,
    signInAdmin,
    getSession,
    isAdmin,
    signOut,
    listOrders,
    updateOrderStatus
  };
})();

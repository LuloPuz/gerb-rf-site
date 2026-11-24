(() => {
  const STATUS = ["Заказ принят","Подтверждён","В производстве","Готов","Отправлен","Получен","Отменён"];
  const els = {
    setup: document.querySelector("[data-admin-setup]"),
    login: document.querySelector("[data-admin-login]"),
    dashboard: document.querySelector("[data-admin-dashboard]"),
    loginForm: document.querySelector("[data-admin-login-form]"),
    loginMessage: document.querySelector("[data-admin-login-message]"),
    signout: document.querySelector("[data-admin-signout]"),
    refresh: document.querySelector("[data-admin-refresh]"),
    stats: document.querySelector("[data-admin-stats]"),
    orders: document.querySelector("[data-admin-orders]"),
    search: document.querySelector("[data-admin-search]"),
    statusFilter: document.querySelector("[data-admin-status-filter]"),
    modeNote: document.querySelector("[data-admin-mode-note]")
  };

  let orders = [];
  let remoteMode = false;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));
  const money = value => new Intl.NumberFormat("ru-RU").format(Number(value)||0)+" ₽";
  const dateTime = value => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("ru-RU",{dateStyle:"short",timeStyle:"short"});
  };

  function localOrders() {
    try {
      const raw = JSON.parse(localStorage.getItem("derzhava_orders_v1") || "[]");
      return raw.map((o, index) => ({
        id: "local-"+index,
        order_number: o.number || "Локальный заказ",
        created_at: o.date,
        status: o.status === "Новый" ? "Заказ принят" : (o.status || "Заказ принят"),
        total: o.total || 0,
        customer_name: o.customer?.name || "",
        customer_phone: o.customer?.phone || "",
        customer_email: o.customer?.email || "",
        organization: o.customer?.organization || "",
        inn: o.customer?.inn || "",
        address: o.customer?.address || "",
        delivery: o.delivery || "",
        comment: o.comment || "",
        items: o.items || [],
        local_preview: true
      }));
    } catch (_) {
      return [];
    }
  }

  function show(mode) {
    els.setup.hidden = mode !== "setup";
    els.login.hidden = mode !== "login";
    els.dashboard.hidden = mode !== "dashboard";
    els.signout.hidden = !(mode === "dashboard" && remoteMode);
  }

  function renderStats(list) {
    const buckets = ["Заказ принят","Подтверждён","В производстве","Готов","Отправлен","Получен"];
    els.stats.innerHTML = buckets.map(status => {
      const count = list.filter(o => o.status === status).length;
      return '<div class="admin-stat"><strong>'+count+'</strong><span>'+esc(status)+'</span></div>';
    }).join("");
  }

  function searchable(order) {
    return [
      order.order_number, order.customer_name, order.customer_phone,
      order.customer_email, order.organization, order.inn, order.address
    ].join(" ").toLowerCase();
  }

  function filteredOrders() {
    const q = String(els.search?.value || "").trim().toLowerCase();
    const status = String(els.statusFilter?.value || "");
    return orders.filter(order => (!q || searchable(order).includes(q)) && (!status || order.status === status));
  }

  function itemMarkup(item) {
    return '<div class="admin-item"><strong>'+esc(item.title || "Товар")+'</strong> · '+
      esc(item.size || "—")+' · '+(Number(item.qty)||1)+' шт. · '+money((Number(item.price)||0)*(Number(item.qty)||1))+'</div>';
  }

  function renderOrders() {
    const list = filteredOrders();
    renderStats(orders);
    if (!list.length) {
      els.orders.innerHTML = '<div class="admin-empty">Заказы по выбранным условиям не найдены.</div>';
      return;
    }

    els.orders.innerHTML = list.map(order => {
      const options = STATUS.map(s => '<option'+(s===order.status?' selected':'')+'>'+esc(s)+'</option>').join("");
      const disabled = remoteMode ? "" : " disabled";
      return '<article class="admin-order" data-order-id="'+esc(order.id)+'">'+
        '<div class="admin-order-main">'+
          '<div class="admin-order-number"><strong>'+esc(order.order_number)+'</strong><small>'+dateTime(order.created_at)+'</small></div>'+
          '<div class="admin-order-customer"><strong>'+esc(order.customer_name || "Без имени")+'</strong><small>'+esc(order.customer_phone || "Телефон не указан")+'</small></div>'+
          '<div class="admin-order-total"><strong>'+money(order.total)+'</strong><small>'+(Array.isArray(order.items)?order.items.length:0)+' поз.</small></div>'+
          '<div><select data-order-status'+disabled+'>'+options+'</select></div>'+
          '<div class="admin-order-date">'+esc(order.organization || order.customer_email || "Частный заказ")+'</div>'+
        '</div>'+
        '<details><summary>Подробности заказа</summary><div class="admin-order-details">'+
          '<div><h4>Контакты</h4>'+
            '<p>Телефон: '+esc(order.customer_phone || "—")+'</p>'+
            '<p>Email: '+esc(order.customer_email || "—")+'</p>'+
            '<p>Организация: '+esc(order.organization || "—")+'</p>'+
            '<p>ИНН: '+esc(order.inn || "—")+'</p>'+
            '<p>Доставка: '+esc(order.delivery || "—")+'</p>'+
            '<p>Адрес: '+esc(order.address || "—")+'</p>'+
            '<p>Комментарий: '+esc(order.comment || "—")+'</p></div>'+
          '<div><h4>Состав</h4><div class="admin-items">'+(Array.isArray(order.items)?order.items.map(itemMarkup).join(""):"")+'</div></div>'+
        '</div></details>'+
      '</article>';
    }).join("");

    if (remoteMode) {
      els.orders.querySelectorAll("[data-order-id]").forEach(card => {
        const select = card.querySelector("[data-order-status]");
        select?.addEventListener("change", async () => {
          select.disabled = true;
          try {
            const updated = await window.DerzhavaBackend.updateOrderStatus(card.dataset.orderId, select.value);
            const index = orders.findIndex(o => o.id === updated.id);
            if (index >= 0) orders[index] = updated;
            renderOrders();
          } catch (error) {
            alert("Не удалось изменить статус: "+(error?.message || error));
            select.disabled = false;
          }
        });
      });
    }
  }

  async function loadOrders() {
    if (remoteMode) {
      orders = await window.DerzhavaBackend.listOrders();
      els.modeNote.textContent = "Общая база заказов. Изменения статусов сохраняются для всех устройств.";
    } else {
      orders = localOrders();
      els.modeNote.textContent = "Локальный предпросмотр: видны только заказы этого браузера. Подключите российский backend в Yandex Cloud для общей базы.";
    }
    renderOrders();
  }

  async function boot() {
    remoteMode = !!window.DerzhavaBackend?.configured();

    if (!remoteMode) {
      show("dashboard");
      els.setup.hidden = false;
      await loadOrders();
      return;
    }

    const session = await window.DerzhavaBackend.getSession();
    if (!session) {
      show("login");
      return;
    }

    if (!(await window.DerzhavaBackend.isAdmin())) {
      await window.DerzhavaBackend.signOut();
      show("login");
      els.loginMessage.textContent = "У этой учётной записи нет прав администратора.";
      return;
    }

    show("dashboard");
    await loadOrders();
  }

  els.loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    els.loginMessage.textContent = "";
    const button = els.loginForm.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const fd = new FormData(els.loginForm);
      await window.DerzhavaBackend.signInAdmin(String(fd.get("email")||""), String(fd.get("password")||""));
      show("dashboard");
      await loadOrders();
    } catch (error) {
      els.loginMessage.textContent = error?.message || "Не удалось войти.";
    } finally {
      button.disabled = false;
    }
  });

  els.signout?.addEventListener("click", async () => {
    await window.DerzhavaBackend.signOut();
    orders = [];
    show("login");
  });

  els.refresh?.addEventListener("click", async () => {
    els.refresh.disabled = true;
    try { await loadOrders(); }
    catch (error) { alert(error?.message || error); }
    finally { els.refresh.disabled = false; }
  });

  els.search?.addEventListener("input", renderOrders);
  els.statusFilter?.addEventListener("change", renderOrders);

  boot().catch(error => {
    show("login");
    els.loginMessage.textContent = error?.message || "Ошибка загрузки админки.";
  });
})();

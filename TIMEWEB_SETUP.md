# Держава — перенос серверной части на Timeweb Cloud
Статус: подготовка, не production. Ветка timeweb-backend; main и GitHub Pages не изменяются.
Целевой сервер: Ubuntu 24.04 LTS, Россия, 1 vCPU / 2 ГБ RAM / 30 ГБ NVMe, IPv4, бэкапы.
Архитектура: HTTPS Nginx -> Node.js API (127.0.0.1:3000) -> PostgreSQL (127.0.0.1:5432).
Повторно используются yandex-backend/index.js, package.json и schema.sql. Адаптер переводит HTTP-запросы в формат существующего обработчика. Yandex Cloud, Lockbox и внешняя БД не требуются.

## После активации VPS (план, не выполнялось)
1. Подключиться по SSH, создать отдельного пользователя, обновить ОС, настроить SSH-ключ, проверить вход и затем отключить пароль. Настроить firewall: SSH ограничить по возможности, наружу открыть только 80/443; 3000 и 5432 не публиковать.
2. Установить Nginx, PostgreSQL и поддерживаемый Node.js LTS (22 или совместимую версию); проверить доступность и версию зависимости pg перед установкой. На 2 ГБ RAM ограничить память PostgreSQL и фоновые процессы; при необходимости настроить swap, мониторинг и алерты.
3. Развернуть эту ветку в /opt/derzhava; создать системного пользователя derzhava без shell и дать ему чтение кода. Установить зависимости в yandex-backend. Выполнить node --test timeweb-backend/server.test.js.
4. Создать БД derzhava и отдельного пользователя derzhava_app. Схему yandex-backend/schema.sql применить от администратора БД; выдать приложению только необходимые права на таблицы и последовательности, без superuser, CREATEDB, CREATEROLE и прав DDL. PostgreSQL слушает только loopback.
5. Создать /etc/derzhava/backend.env (root:root, 0600), используя .env.example как шаблон. Сгенерировать случайные пароль БД и ADMIN_TOKEN_SECRET на сервере; не отправлять их в чат, не добавлять в GitHub. Создать первого администратора с уникальным паролем (bcrypt/pgcrypto, не более 72 байт) через локальный защищённый ввод; не сохранять пароль в истории команд.
6. Установить derzhava.service, проверить путь node, запустить через systemd; проверить локальный /api?action=health. Настроить домен и HTTPS, добавить nginx-api.example.conf только в HTTPS server block. До прохождения проверок не публиковать API и не менять backend-config.js.
7. Проверить восстановление бэкапа PostgreSQL и файлов, хранить резервные копии отдельно в РФ; проверить мониторинг RAM, диска, CPU, ошибки API.

## Обязательные этапы до реальных заказов
- Авторизация клиента по телефону через SMS-провайдера: одноразовые коды с ограничением попыток и отправок, сроком действия, лимитом расходов; сессии с проверкой владельца заказа, выходом и отзывом сессий.
- Серверный каталог с подтверждёнными ценами по артикулу и размеру; не доверять суммам, цене и статусу из браузера. Сейчас create-order намеренно отвечает 503.
- Подключить профиль и историю заказов к защищённому API вместо локального тестового режима; не переносить тестовые данные.
- Защитить админку, проверить XSS, права, отзыв сессий, журнал изменений и пагинацию; реализовать заявки и управление товарами.
- Подготовить политику и согласия по обработке персональных данных, проверить применимые требования 152-ФЗ. Не передавать реальные данные до готовности.
- Тесты БД, SMS, цен, доступа к чужим заказам, повторных запросов, нагрузки и восстановления. Только после успешных тестов включить production и переключить сайт.

## Customer authorization (staged)
Apply timeweb-backend/customer-schema.sql after base schema; grant the app minimal DML rights for customers, customer_sms_challenges, customer_sms_requests, customer_sessions and required sequences. Do not grant DDL or superuser. Use a separate random CUSTOMER_AUTH_SECRET. Customer API remains disabled by default. Same-origin HTTPS only (site and API on the final Russian-hosted domain). Do not enable on GitHub Pages. SMS Aero credentials and approved sender must be configured locally; see https://smsaero.ru/integration/documentation/api/. Check sender approval, agreement, delivery speed and actual cost first. Default cap: 20 reserved SMS attempts per rolling 24h, not a guaranteed ruble cap; adjust after confirming per-message cost and provider balance limits. Codes expire in 5 minutes; 5 verification attempts, 60s per contact, 5 requests/contact/hour, 15/IP/hour. Sessions use secure HttpOnly cookies with 7-day expiry. Only customers explicitly linked to an order can receive a code. Never auto-link by unverified order phone; a secure checkout/enrollment flow is still required. Schedule deletion of expired sessions, old challenges and requests (keep at least 24h for limits); review retention policy. Add integration tests with a real disposable PostgreSQL database and simulated SMS, concurrency, ownership, revocation, and load before enablement. Browser integration and profile editing remain separate steps. Run node --test timeweb-backend/*.test.js. No real SMS sent in development.

-- Existing PostgreSQL orders table only. Apply before updated API.
BEGIN;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
UPDATE public.orders SET status='В производстве' WHERE status='Готов';
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('Заказ принят','Подтверждён','Ожидает оплаты','В производстве','Отправлен','Получен','Отменён'));
COMMIT;

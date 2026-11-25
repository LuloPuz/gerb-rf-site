-- Apply to an existing PostgreSQL orders table before deploying the updated API.
-- Historical 'Готов' orders must never be moved backward to payment.
BEGIN;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
UPDATE public.orders SET status='В производстве' WHERE status='Готов';
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('Заказ принят','Подтверждён','Ожидает оплаты','В производстве','Отправлен','Получен','Отменён'));
COMMIT;

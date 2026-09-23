-- Additive migration: preserve all existing accounts, reports and dataset values.
ALTER TABLE app_users ADD COLUMN iin varchar(12) UNIQUE;
ALTER TABLE app_users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE app_users ADD CONSTRAINT user_identifier CHECK (email IS NOT NULL OR iin IS NOT NULL);
ALTER TABLE app_users ADD CONSTRAINT iin_format CHECK (iin IS NULL OR iin ~ '^[0-9]{12}$');
ALTER TABLE qr_locations ADD COLUMN street_name varchar(200);
CREATE INDEX problems_analytics ON problems(district_id,status,location_label);

CREATE TABLE ml_training_samples (
 id bigserial PRIMARY KEY, topic varchar(40) NOT NULL, body text NOT NULL,
 source varchar(60) NOT NULL DEFAULT 'synthetic-bootstrap-v1', UNIQUE(topic,body)
);
INSERT INTO ml_training_samples(topic,body) VALUES
 ('WASTE_CAPACITY','Во дворе нет мусорных баков, нужны дополнительные контейнеры'),
 ('WASTE_CAPACITY','На улице мало урн для мусора возле остановки'),
 ('WASTE_CAPACITY','Установите больше мусорных баков возле домов'),
 ('WASTE_CAPACITY','Контейнеров недостаточно, мусор лежит на земле'),
 ('WASTE_COLLECTION','Мусор не вывозят неделю, контейнеры переполнены'),
 ('WASTE_COLLECTION','Баки полные отходов, нужен частый вывоз мусора'),
 ('WASTE_COLLECTION','Переполненные контейнеры, неприятный запах, уборки нет'),
 ('WASTE_COLLECTION','Мусоровоз давно не приезжает, накопились отходы'),
 ('LIGHTING','Не работает фонарь, улица темная, освещение отсутствует'),
 ('LIGHTING','Фонари погасли возле остановки, вечером опасно'),
 ('LIGHTING','Лампа сломана во дворе, требуется ремонт освещения'),
 ('LIGHTING','Нет света на пешеходной дорожке ночью'),
 ('ROADS','Ямы на дороге, повреждён асфальт, нужен ремонт'),
 ('ROADS','Разбитый тротуар, плитка просела, невозможно пройти'),
 ('ROADS','Опасный переход, светофор не работает'),
 ('ROADS','Дорожное покрытие разрушено, пешеходный переход опасен'),
 ('GREEN','Деревья высохли, нужен полив и озеленение'),
 ('GREEN','В парке сломаны ветки, кусты и газон засохли'),
 ('GREEN','Нужна посадка деревьев и уход за сквером'),
 ('GREEN','Нет зелени, деревья не поливают'),
 ('UTILITIES','Авария водопровода, труба течёт, нет воды'),
 ('UTILITIES','Отопление отключено, батареи холодные'),
 ('UTILITIES','Прорыв трубы, затоплен двор, нужна аварийная бригада'),
 ('UTILITIES','Канализация течёт, проблема с водоснабжением'),
 ('TRANSPORT','Автобус долго не приходит, большой интервал'),
 ('TRANSPORT','На остановке нет навеса, нужен новый маршрут'),
 ('TRANSPORT','Переполненный автобус, мало общественного транспорта'),
 ('TRANSPORT','Остановка далеко, транспорт ходит редко'),
 ('SOCIAL','Не хватает мест в школе и детском саду'),
 ('SOCIAL','Поликлиника переполнена, запись к врачу недоступна'),
 ('SOCIAL','Нужен детский сад, очередь в школу'),
 ('SOCIAL','Нет поликлиники рядом, не хватает врачей');

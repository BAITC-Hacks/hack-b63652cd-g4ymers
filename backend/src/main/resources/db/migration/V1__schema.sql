CREATE TABLE districts (
 id varchar(30) PRIMARY KEY, name varchar(60) NOT NULL, population numeric(5,4) NOT NULL CHECK (population > 0 AND population <= 1),
 note text NOT NULL, metric_values jsonb NOT NULL CHECK (jsonb_array_length(metric_values) = 10), ordinal int NOT NULL UNIQUE
);
CREATE TABLE measures (
 id varchar(8) PRIMARY KEY, name varchar(120) NOT NULL, description text NOT NULL, category varchar(30) NOT NULL,
 cost int NOT NULL CHECK (cost > 0), lag int NOT NULL CHECK (lag BETWEEN 0 AND 8), city boolean NOT NULL, effects jsonb NOT NULL, ordinal int NOT NULL UNIQUE
);
CREATE TABLE app_users (
 id uuid PRIMARY KEY, email varchar(254) NOT NULL UNIQUE, password_hash varchar(100) NOT NULL,
 display_name varchar(80) NOT NULL, district_id varchar(30) NOT NULL REFERENCES districts,
 role varchar(10) NOT NULL CHECK (role IN ('CITIZEN','AKIM')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE access_tokens (
 token_hash char(64) PRIMARY KEY, user_id uuid NOT NULL REFERENCES app_users ON DELETE CASCADE, expires_at timestamptz NOT NULL
);
CREATE INDEX access_tokens_expiry ON access_tokens(expires_at);
CREATE TABLE qr_locations (
 code varchar(80) PRIMARY KEY, district_id varchar(30) NOT NULL REFERENCES districts, object_name varchar(160) NOT NULL,
 object_type varchar(100) NOT NULL, latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180), active boolean NOT NULL DEFAULT true
);
CREATE TABLE problems (
 id uuid PRIMARY KEY, reporter_id uuid NOT NULL REFERENCES app_users, title varchar(100) NOT NULL, description varchar(2000) NOT NULL,
 category varchar(40) NOT NULL CHECK (category IN ('TRANSPORT','GREEN_SPACES','SOCIAL_INFRASTRUCTURE','SAFETY','CITY_SERVICES')),
 urgency varchar(15) NOT NULL CHECK (urgency IN ('NORMAL','IMPORTANT','URGENT')),
 status varchar(20) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','UNDER_REVIEW','PLANNED','IN_PROGRESS','RESOLVED','REJECTED')),
 district_id varchar(30) NOT NULL REFERENCES districts, qr_code varchar(80) REFERENCES qr_locations,
 location_label varchar(200) NOT NULL, latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180), photo_url varchar(500),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), version int NOT NULL DEFAULT 0
);
CREATE INDEX problems_feed ON problems(created_at DESC, id);
CREATE INDEX problems_district_status ON problems(district_id,status,created_at DESC);
CREATE INDEX problems_reporter ON problems(reporter_id,created_at DESC);
CREATE TABLE confirmations (
 problem_id uuid NOT NULL REFERENCES problems ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES app_users,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(problem_id,user_id)
);
CREATE TABLE comments (
 id uuid PRIMARY KEY, problem_id uuid NOT NULL REFERENCES problems ON DELETE CASCADE, author_id uuid NOT NULL REFERENCES app_users,
 body varchar(1000) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_problem ON comments(problem_id,created_at);
CREATE TABLE problem_history (
 id uuid PRIMARY KEY, problem_id uuid NOT NULL REFERENCES problems ON DELETE CASCADE, actor_id uuid NOT NULL REFERENCES app_users,
 from_status varchar(20), to_status varchar(20) NOT NULL, note varchar(1000) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX history_problem ON problem_history(problem_id,created_at);
CREATE TABLE scenarios (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES app_users, name varchar(120) NOT NULL,
 selections jsonb NOT NULL, result jsonb NOT NULL, budget int NOT NULL CHECK (budget BETWEEN 0 AND 100),
 status varchar(10) NOT NULL CHECK (status IN ('DRAFT','FINAL')), version int NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scenarios_owner ON scenarios(owner_id,created_at DESC);

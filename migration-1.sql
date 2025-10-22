CREATE EXTENSION IF NOT EXISTS pgcrypto;
DROP TYPE IF EXISTS role_enum CASCADE;
CREATE TYPE role_enum AS ENUM ('admin', 'user');

DROP TABLE IF EXISTS account CASCADE;
CREATE TABLE IF NOT EXISTS account
(
    id            uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    email         text UNIQUE NOT NULL,
    password_hash text        NOT NULL,
    role          role_enum   NOT NULL DEFAULT 'user',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS post CASCADE;
CREATE TABLE IF NOT EXISTS post
(
    id         uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    content    text        NOT NULL,
    author_id  uuid        NOT NULL REFERENCES account (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS comment CASCADE;
CREATE TABLE IF NOT EXISTS comment
(
    id         uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    content    text        NOT NULL,
    author_id  uuid        NOT NULL REFERENCES account (id) ON DELETE CASCADE,
    post_id    uuid        NOT NULL REFERENCES post (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- seed
INSERT INTO account (email, password_hash, role)
VALUES ('admin@mail.com', crypt('admin', gen_salt('bf', 10)), 'admin'),
       ('user@mail.com', crypt('user', gen_salt('bf', 10)), 'user');

INSERT INTO post (content, author_id)
SELECT 'This is a post ' || gen_random_uuid()::text,
       account.id
FROM account;

-- insert comment with random uuid into with dot product of post and account
INSERT INTO comment (content, author_id, post_id)
SELECT 'This is a comment ' || gen_random_uuid()::text,
       account.id,
       post.id
FROM account CROSS JOIN post
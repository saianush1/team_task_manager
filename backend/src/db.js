const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(200)  NOT NULL,
        email       VARCHAR(255)  NOT NULL UNIQUE,
        password    TEXT          NOT NULL,
        role        VARCHAR(20)   NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
        avatar      TEXT          NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS projects (
        id          SERIAL PRIMARY KEY,
        title       VARCHAR(100)  NOT NULL,
        description VARCHAR(500)  NOT NULL DEFAULT '',
        owner_id    INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status      VARCHAR(20)   NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','on-hold')),
        color       VARCHAR(20)   NOT NULL DEFAULT '#6366f1',
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS project_members (
        project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (project_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS join_requests (
        id           SERIAL PRIMARY KEY,
        project_id   INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id      INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status       VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at  TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id          SERIAL PRIMARY KEY,
        title       VARCHAR(200)  NOT NULL,
        description VARCHAR(1000) NOT NULL DEFAULT '',
        project_id  INTEGER       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        creator_id  INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status      VARCHAR(20)   NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in-progress','done')),
        priority    VARCHAR(10)   NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
        due_date    TIMESTAMPTZ,
        tags        TEXT[]        NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS task_assignees (
        task_id  INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, user_id)
      );
    `);
    console.log('✅ PostgreSQL tables initialised');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };

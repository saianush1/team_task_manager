const { pool } = require('../db');

// ─── formatters ───────────────────────────────────────────────────────────────

function formatUser(row) {
  if (!row) return null;
  return { _id: row.id, id: row.id, name: row.name, email: row.email, role: row.role, avatar: row.avatar || '' };
}

function formatJoinRequest(row) {
  return {
    _id: row.jr_id,
    id: row.jr_id,
    user: row.jr_user_id ? formatUser({
      id: row.jr_user_id, name: row.jr_user_name,
      email: row.jr_user_email, role: row.jr_user_role, avatar: row.jr_user_avatar
    }) : null,
    status: row.jr_status,
    requestedAt: row.jr_requested_at,
    resolvedAt: row.jr_resolved_at
  };
}

function groupProject(rows) {
  if (!rows || rows.length === 0) return null;
  const first = rows[0];
  const project = {
    _id: first.id, id: first.id,
    title: first.title, description: first.description,
    status: first.status, color: first.color,
    createdAt: first.created_at, updatedAt: first.updated_at,
    owner: formatUser({ id: first.owner_id, name: first.owner_name, email: first.owner_email, role: first.owner_role, avatar: first.owner_avatar }),
    members: [],
    joinRequests: []
  };

  const memberMap = new Map();
  const jrMap = new Map();

  for (const row of rows) {
    if (row.member_id && !memberMap.has(row.member_id)) {
      memberMap.set(row.member_id, formatUser({ id: row.member_id, name: row.member_name, email: row.member_email, role: row.member_role, avatar: row.member_avatar }));
    }
    if (row.jr_id && !jrMap.has(row.jr_id)) {
      jrMap.set(row.jr_id, formatJoinRequest(row));
    }
  }

  project.members = [...memberMap.values()];
  project.joinRequests = [...jrMap.values()];
  return project;
}

// ─── SQL helpers ──────────────────────────────────────────────────────────────

const PROJECT_SELECT = `
  SELECT
    p.id, p.title, p.description, p.status, p.color, p.created_at, p.updated_at,
    p.owner_id,
    ou.name  AS owner_name,  ou.email AS owner_email,  ou.role AS owner_role,  ou.avatar AS owner_avatar,
    mu.id    AS member_id,   mu.name  AS member_name,  mu.email AS member_email, mu.role AS member_role, mu.avatar AS member_avatar,
    jr.id    AS jr_id,       jr.user_id AS jr_user_id, jr.status AS jr_status,
    jr.requested_at AS jr_requested_at, jr.resolved_at AS jr_resolved_at,
    jru.name AS jr_user_name, jru.email AS jr_user_email, jru.role AS jr_user_role, jru.avatar AS jr_user_avatar
  FROM projects p
  JOIN users ou ON ou.id = p.owner_id
  LEFT JOIN project_members pm ON pm.project_id = p.id
  LEFT JOIN users mu ON mu.id = pm.user_id
  LEFT JOIN join_requests jr ON jr.project_id = p.id
  LEFT JOIN users jru ON jru.id = jr.user_id
`;

const Project = {
  async findAll() {
    const { rows } = await pool.query(`${PROJECT_SELECT} ORDER BY p.created_at DESC`);
    // group by project id
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.id)) map.set(row.id, []);
      map.get(row.id).push(row);
    }
    return [...map.values()].map(groupProject);
  },

  async findById(id) {
    const { rows } = await pool.query(`${PROJECT_SELECT} WHERE p.id = $1`, [id]);
    return groupProject(rows);
  },

  async create({ title, description = '', status = 'active', color = '#6366f1', owner_id, memberIds = [] }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO projects (title, description, status, color, owner_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [title, description, status, color, owner_id]
      );
      const projectId = rows[0].id;

      // Always add owner as member
      const allMembers = [...new Set([owner_id, ...memberIds])];
      for (const uid of allMembers) {
        await client.query(
          `INSERT INTO project_members (project_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [projectId, uid]
        );
      }
      await client.query('COMMIT');
      return this.findById(projectId);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async update(id, { title, description, status, color }) {
    await pool.query(
      `UPDATE projects SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        color = COALESCE($4, color),
        updated_at = NOW()
       WHERE id = $5`,
      [title || null, description !== undefined ? description : null, status || null, color || null, id]
    );
    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
  },

  // ── member management ──────────────────────────────────────────────────────
  async addMember(projectId, userId) {
    await pool.query(
      `INSERT INTO project_members (project_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [projectId, userId]
    );
  },

  async removeMember(projectId, userId) {
    await pool.query(
      `DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );
  },

  async isMember(projectId, userId) {
    const { rows } = await pool.query(
      `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    return rows.length > 0;
  },

  async getMembers(projectId) {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar
       FROM project_members pm JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1`,
      [projectId]
    );
    return rows.map(r => formatUser(r));
  },

  // ── join requests ──────────────────────────────────────────────────────────
  async addJoinRequest(projectId, userId) {
    // remove old rejected requests first
    await pool.query(
      `DELETE FROM join_requests WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    await pool.query(
      `INSERT INTO join_requests (project_id, user_id, status) VALUES ($1,$2,'pending')`,
      [projectId, userId]
    );
  },

  async hasPendingRequest(projectId, userId) {
    const { rows } = await pool.query(
      `SELECT 1 FROM join_requests WHERE project_id = $1 AND user_id = $2 AND status = 'pending'`,
      [projectId, userId]
    );
    return rows.length > 0;
  },

  async resolveJoinRequest(projectId, userId, status) {
    await pool.query(
      `UPDATE join_requests SET status = $1, resolved_at = NOW()
       WHERE project_id = $2 AND user_id = $3 AND status = 'pending'`,
      [status, projectId, userId]
    );
  },

  async getPendingRequestsAcrossProjects() {
    const { rows } = await pool.query(`
      SELECT p.id AS project_id, p.title AS project_title, p.color AS project_color,
             jr.id AS request_id, jr.requested_at,
             u.id AS user_id, u.name AS user_name, u.email AS user_email, u.avatar AS user_avatar
      FROM join_requests jr
      JOIN projects p ON p.id = jr.project_id
      JOIN users u ON u.id = jr.user_id
      WHERE jr.status = 'pending'
      ORDER BY jr.requested_at DESC
    `);
    return rows.map(r => ({
      projectId: r.project_id, projectTitle: r.project_title, projectColor: r.project_color,
      requestId: r.request_id, requestedAt: r.requested_at,
      user: { _id: r.user_id, id: r.user_id, name: r.user_name, email: r.user_email, avatar: r.user_avatar }
    }));
  },

  async taskCount(projectId) {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM tasks WHERE project_id = $1', [projectId]);
    return rows[0].cnt;
  },

  async completedTaskCount(projectId) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM tasks WHERE project_id = $1 AND status = 'done'`,
      [projectId]
    );
    return rows[0].cnt;
  },

  async myJoinStatus(projectId, userId) {
    const { rows } = await pool.query(
      `SELECT status FROM join_requests WHERE project_id = $1 AND user_id = $2 ORDER BY requested_at DESC LIMIT 1`,
      [projectId, userId]
    );
    return rows[0]?.status || null;
  }
};

module.exports = Project;

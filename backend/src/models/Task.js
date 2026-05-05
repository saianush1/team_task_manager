const { pool } = require('../db');

// ─── formatters ───────────────────────────────────────────────────────────────

function formatUser(row) {
  if (!row) return null;
  return { _id: row.id, id: row.id, name: row.name, email: row.email, avatar: row.avatar || '' };
}

function groupTask(rows) {
  if (!rows || rows.length === 0) return null;
  const first = rows[0];
  const task = {
    _id: first.id, id: first.id,
    title: first.title, description: first.description,
    status: first.status, priority: first.priority,
    dueDate: first.due_date,
    tags: first.tags || [],
    createdAt: first.created_at, updatedAt: first.updated_at,
    isOverdue: first.due_date && first.status !== 'done' && new Date() > new Date(first.due_date),
    project: first.project_id ? { _id: first.project_id, id: first.project_id, title: first.project_title, color: first.project_color } : null,
    creator: first.creator_id ? { _id: first.creator_id, id: first.creator_id, name: first.creator_name, email: first.creator_email } : null,
    assignees: []
  };

  const assigneeMap = new Map();
  for (const row of rows) {
    if (row.assignee_id && !assigneeMap.has(row.assignee_id)) {
      assigneeMap.set(row.assignee_id, formatUser({ id: row.assignee_id, name: row.assignee_name, email: row.assignee_email, avatar: row.assignee_avatar }));
    }
  }
  task.assignees = [...assigneeMap.values()];
  return task;
}

// ─── SQL helpers ──────────────────────────────────────────────────────────────

const TASK_SELECT = `
  SELECT
    t.id, t.title, t.description, t.status, t.priority, t.due_date, t.tags, t.created_at, t.updated_at,
    t.project_id, pr.title AS project_title, pr.color AS project_color,
    t.creator_id, cu.name AS creator_name, cu.email AS creator_email,
    au.id AS assignee_id, au.name AS assignee_name, au.email AS assignee_email, au.avatar AS assignee_avatar
  FROM tasks t
  JOIN projects pr ON pr.id = t.project_id
  JOIN users cu ON cu.id = t.creator_id
  LEFT JOIN task_assignees ta ON ta.task_id = t.id
  LEFT JOIN users au ON au.id = ta.user_id
`;

function buildTasksFromRows(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.id)) map.set(row.id, []);
    map.get(row.id).push(row);
  }
  return [...map.values()].map(groupTask);
}

const Task = {
  async findById(id) {
    const { rows } = await pool.query(`${TASK_SELECT} WHERE t.id = $1`, [id]);
    return groupTask(rows);
  },

  async find({ projectId, assigneeId, status, priority } = {}) {
    let where = 'WHERE 1=1';
    const params = [];
    if (projectId) { params.push(projectId); where += ` AND t.project_id = $${params.length}`; }
    if (assigneeId) { params.push(assigneeId); where += ` AND ta.user_id = $${params.length}`; }
    if (status) { params.push(status); where += ` AND t.status = $${params.length}`; }
    if (priority) { params.push(priority); where += ` AND t.priority = $${params.length}`; }

    const { rows } = await pool.query(`${TASK_SELECT} ${where} ORDER BY t.created_at DESC`, params);
    return buildTasksFromRows(rows);
  },

  async count({ projectId, assigneeId, status, notStatus, overdue } = {}) {
    let where = 'WHERE 1=1';
    const params = [];
    if (projectId) { params.push(projectId); where += ` AND t.project_id = $${params.length}`; }
    if (assigneeId) { params.push(assigneeId); where += ` AND ta.user_id = $${params.length}`; }
    if (status) { params.push(status); where += ` AND t.status = $${params.length}`; }
    if (notStatus) { params.push(notStatus); where += ` AND t.status != $${params.length}`; }
    if (overdue) where += ` AND t.due_date < NOW()`;

    const joinClause = assigneeId ? 'LEFT JOIN task_assignees ta ON ta.task_id = t.id' : 'LEFT JOIN task_assignees ta ON ta.task_id = t.id';
    const { rows } = await pool.query(
      `SELECT COUNT(DISTINCT t.id)::int AS cnt FROM tasks t ${joinClause} ${where}`,
      params
    );
    return rows[0].cnt;
  },

  async findRecent({ assigneeId, limit = 5 } = {}) {
    const where = assigneeId ? 'WHERE ta.user_id = $1' : 'WHERE 1=1';
    const params = assigneeId ? [assigneeId] : [];
    const { rows } = await pool.query(
      `${TASK_SELECT} ${where} ORDER BY t.updated_at DESC LIMIT ${limit}`,
      params
    );
    return buildTasksFromRows(rows);
  },

  async findOverdue({ assigneeId, limit = 5 } = {}) {
    let where = `WHERE t.status != 'done' AND t.due_date < NOW()`;
    const params = [];
    if (assigneeId) { params.push(assigneeId); where += ` AND ta.user_id = $${params.length}`; }
    const { rows } = await pool.query(
      `${TASK_SELECT} ${where} ORDER BY t.due_date ASC LIMIT ${limit}`,
      params
    );
    return buildTasksFromRows(rows);
  },

  async create({ title, description = '', projectId, assigneeIds = [], creatorId, status = 'todo', priority = 'medium', dueDate = null, tags = [] }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO tasks (title, description, project_id, creator_id, status, priority, due_date, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [title, description, projectId, creatorId, status, priority, dueDate, tags]
      );
      const taskId = rows[0].id;
      for (const uid of assigneeIds) {
        await client.query(
          `INSERT INTO task_assignees (task_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [taskId, uid]
        );
      }
      await client.query('COMMIT');
      return this.findById(taskId);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async update(id, { title, description, status, priority, dueDate, tags }) {
    await pool.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        due_date = COALESCE($5, due_date),
        tags = COALESCE($6, tags),
        updated_at = NOW()
       WHERE id = $7`,
      [
        title || null,
        description !== undefined ? description : null,
        status || null,
        priority || null,
        dueDate !== undefined ? (dueDate || null) : null,
        tags || null,
        id
      ]
    );
    return this.findById(id);
  },

  async updateStatus(id, status) {
    await pool.query(
      `UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id]
    );
    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  },

  async deleteByProject(projectId) {
    await pool.query('DELETE FROM tasks WHERE project_id = $1', [projectId]);
  },

  async isAssignee(taskId, userId) {
    const { rows } = await pool.query(
      `SELECT 1 FROM task_assignees WHERE task_id = $1 AND user_id = $2`,
      [taskId, userId]
    );
    return rows.length > 0;
  }
};

module.exports = Task;

import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import cron, { ScheduledTask } from 'node-cron';
import git from 'isomorphic-git';
// @ts-ignore
import http from 'isomorphic-git/http/node/index.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize SQLite DB for config and logs
const db = new Database('app.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    pg_url TEXT,
    git_url TEXT,
    git_branch TEXT,
    git_token TEXT,
    git_name TEXT,
    git_email TEXT,
    cron_schedule TEXT DEFAULT '0 * * * *'
  );
  
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    level TEXT,
    message TEXT
  );
  
  INSERT OR IGNORE INTO config (id) VALUES (1);
`);

const logMessage = (level: string, message: string) => {
  console.log(`[${level}] ${message}`);
  db.prepare('INSERT INTO logs (level, message) VALUES (?, ?)').run(level, message);
};

// API Routes
app.get('/api/config', (req, res) => {
  const config = db.prepare('SELECT * FROM config WHERE id = 1').get();
  res.json(config);
});

app.post('/api/config', (req, res) => {
  const { pg_url, git_url, git_branch, git_token, git_name, git_email, cron_schedule } = req.body;
  db.prepare(`
    UPDATE config SET 
      pg_url = ?, git_url = ?, git_branch = ?, git_token = ?, git_name = ?, git_email = ?, cron_schedule = ?
    WHERE id = 1
  `).run(pg_url, git_url, git_branch, git_token, git_name, git_email, cron_schedule || '0 * * * *');
  res.json({ success: true });
});

app.get('/api/logs', (req, res) => {
  const logs = db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT 100').all();
  res.json(logs);
});

let currentCronJob: ScheduledTask | null = null;

const exportAndPush = async () => {
  const config = db.prepare('SELECT * FROM config WHERE id = 1').get() as any;
  if (!config.pg_url || !config.git_url || !config.git_token) {
    logMessage('ERROR', 'Missing configuration. Cannot export.');
    return;
  }

  logMessage('INFO', 'Starting export process...');
  const exportDir = path.join(process.cwd(), 'export_tmp');
  
  try {
    if (fs.existsSync(exportDir)) {
      fs.rmSync(exportDir, { recursive: true, force: true });
    }
    fs.mkdirSync(exportDir, { recursive: true });

    // 1. Clone the repository
    logMessage('INFO', `Cloning repository ${config.git_url}...`);
    await git.clone({
      fs,
      http,
      dir: exportDir,
      url: config.git_url,
      ref: config.git_branch || 'main',
      singleBranch: true,
      depth: 1,
      onAuth: () => ({ username: config.git_token })
    });

    // 2. Connect to PG and dump data
    logMessage('INFO', 'Connecting to PostgreSQL...');
    const client = new Client({ connectionString: config.pg_url });
    await client.connect();
    
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tables = tablesRes.rows.map(r => r.table_name);
    logMessage('INFO', `Found ${tables.length} tables to export.`);

    for (const table of tables) {
      const dataRes = await client.query(`SELECT * FROM "${table}"`);
      fs.writeFileSync(
        path.join(exportDir, `${table}.json`), 
        JSON.stringify(dataRes.rows, null, 2)
      );
    }
    
    await client.end();
    logMessage('INFO', 'Database export completed successfully.');

    // 3. Git Add, Commit, Push
    logMessage('INFO', 'Adding files to Git...');
    for (const table of tables) {
      await git.add({ fs, dir: exportDir, filepath: `${table}.json` });
    }
    
    const statusMatrix = await git.statusMatrix({ fs, dir: exportDir });
    const hasChanges = statusMatrix.some(row => row[1] !== row[2] || row[2] !== row[3]);

    if (!hasChanges) {
      logMessage('INFO', 'No changes detected. Skipping commit and push.');
      return;
    }

    logMessage('INFO', 'Committing changes...');
    await git.commit({
      fs,
      dir: exportDir,
      author: {
        name: config.git_name || 'DB Exporter',
        email: config.git_email || 'exporter@example.com',
      },
      message: `Database export: ${new Date().toISOString()}`
    });
    
    logMessage('INFO', 'Pushing to remote repository...');
    await git.push({
      fs,
      http,
      dir: exportDir,
      remote: 'origin',
      ref: config.git_branch || 'main',
      onAuth: () => ({ username: config.git_token })
    });
    
    logMessage('INFO', 'Successfully pushed to remote repository.');
  } catch (error: any) {
    logMessage('ERROR', `Export failed: ${error.message}`);
    console.error(error);
  } finally {
    // Cleanup
    if (fs.existsSync(exportDir)) {
      fs.rmSync(exportDir, { recursive: true, force: true });
    }
  }
};

app.post('/api/trigger', async (req, res) => {
  exportAndPush(); // Run asynchronously
  res.json({ success: true, message: 'Export triggered' });
});

app.post('/api/start', (req, res) => {
  const config = db.prepare('SELECT * FROM config WHERE id = 1').get() as any;
  if (currentCronJob) {
    currentCronJob.stop();
  }
  
  const schedule = config.cron_schedule || '0 * * * *';
  currentCronJob = cron.schedule(schedule, exportAndPush);
  logMessage('INFO', `Cron job started with schedule: ${schedule}`);
  res.json({ success: true });
});

app.post('/api/stop', (req, res) => {
  if (currentCronJob) {
    currentCronJob.stop();
    currentCronJob = null;
    logMessage('INFO', 'Cron job stopped.');
  }
  res.json({ success: true });
});

app.get('/api/status', (req, res) => {
  res.json({ running: currentCronJob !== null });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

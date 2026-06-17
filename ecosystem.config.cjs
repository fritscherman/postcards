// pm2 process definition. The Node process serves BOTH the built frontend
// (../dist) and the /api routes — one process, one origin.
// Secrets (JWT_SECRET, SMTP_*) come from server/.env via dotenv, not from here.
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'postcards',
      cwd: path.join(__dirname, 'server'),
      script: 'dist/index.js',
      env: { NODE_ENV: 'production' },
      autorestart: true,
      max_restarts: 10,
    },
  ],
};

// pm2 process definition for the Next.js server on the droplet.
//   pm2 start ecosystem.config.cjs && pm2 save
// nginx proxies mrbedmed.com to 127.0.0.1:$MRBEDMED_PORT (scripts/setup-next-server.sh).
module.exports = {
  apps: [
    {
      name: 'mrbedmed',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      // Only reachable through nginx.
      args: 'start -H 127.0.0.1',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '700M',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.MRBEDMED_PORT || '3100',
      },
    },
  ],
};

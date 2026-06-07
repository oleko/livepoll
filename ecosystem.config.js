module.exports = {
  apps: [
    {
      name: "livepoll",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/livepoll",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/pm2/livepoll-error.log",
      out_file:   "/var/log/pm2/livepoll-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      max_memory_restart: "1500M",
      restart_delay: 3000,
    },
  ],
};

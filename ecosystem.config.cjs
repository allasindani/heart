module.exports = {
  apps: [
    {
      name: 'chat-opramixes',
      script: 'server.ts',
      interpreter: 'tsx',
      env: {
        NODE_ENV: 'production',
        PORT: 3005
      },
      // Restart policy to prevent infinite loops if something is wrong
      max_restarts: 10,
      restart_delay: 4000,
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'heart-connect',
      script: 'server.ts',
      interpreter: 'tsx',
      env: {
        NODE_ENV: 'development',
        PORT: 3006
      },
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
};

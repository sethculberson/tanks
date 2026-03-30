module.exports = {
  apps: [
    {
      name: 'tank-trouble',
      script: './server/dist/index.js',
      cwd: '/home/sethculb/tank',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        FIREBASE_PROJECT_ID: 'tanks-491513',
      },
    },
  ],
};

module.exports = {
  apps: [
    {
      name: 'tank-trouble',
      script: './server/src/index.js',
      cwd: '/tank',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        FIREBASE_PROJECT_ID: 'tanks-491513',
      },
    },
  ],
};

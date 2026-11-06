import 'dotenv/config';

import app from './app.js';
import { checkDatabase } from './config/database.js';

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => {
  console.log(`Pravaah API listening on port ${port}`);

  // Check the database on startup so local development reports its status
  // directly in the terminal without opening the health URL.
  checkDatabase()
    .then(() => console.log('Database connected successfully'))
    .catch((error) => {
      console.error('Database health check failed:', error.message);
    });
});

function shutdown(signal) {
  console.log(`${signal} received; closing HTTP server`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));


import 'dotenv/config';
import { createApp } from './app.js';
import { openDatabase } from './db.js';

const port = Number(process.env.PORT || 3001);
const database = openDatabase(process.env.DATABASE_PATH || './data/stockflow.sqlite');
const app = createApp(database, { trustProxy: process.env.NODE_ENV === 'production' });

const server = app.listen(port, () => {
  console.log(`StockFlow server listening on http://localhost:${port}`);
});

function close() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on('SIGINT', close);
process.on('SIGTERM', close);
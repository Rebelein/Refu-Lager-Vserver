import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import { createCrudRouter } from './routes/crud.js';
import { ArticleModel, MachineModel, UserModel, LocationModel, WholesalerModel, OrderModel, AppSettingsModel } from './models/index.js';
import { watchCollection } from './realtime/watchCollections.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lagerrebelein';
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

async function main() {
  // DB connect
  await mongoose.connect(MONGO_URI);

  const app = express();
  const server = http.createServer(app);
  const allowedOrigins = ORIGIN.split(',').map((s) => s.trim());
  const io = new SocketIOServer(server, {
    cors: { origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
  });

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('CORS not allowed'), false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));

  // Health
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '0.1.0' });
  });

  // Socket.io basic connection log
  io.on('connection', (socket) => {
    // eslint-disable-next-line no-console
    console.log('client connected', socket.id);
    socket.on('disconnect', () => {
      // eslint-disable-next-line no-console
      console.log('client disconnected', socket.id);
    });
  });

  // API routes
  app.use('/api/articles', createCrudRouter(ArticleModel));
  app.use('/api/machines', createCrudRouter(MachineModel));
  app.use('/api/users', createCrudRouter(UserModel));
  app.use('/api/locations', createCrudRouter(LocationModel));
  app.use('/api/wholesalers', createCrudRouter(WholesalerModel));
  app.use('/api/orders', createCrudRouter(OrderModel));
  app.use('/api/app_settings', createCrudRouter(AppSettingsModel));

  // change streams
  const stopWatchers = [
    watchCollection(ArticleModel, io, 'articles'),
    watchCollection(MachineModel, io, 'machines'),
    watchCollection(UserModel, io, 'users'),
    watchCollection(LocationModel, io, 'locations'),
    watchCollection(WholesalerModel, io, 'wholesalers'),
    watchCollection(OrderModel, io, 'orders'),
    watchCollection(AppSettingsModel, io, 'app_settings'),
  ];

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on :${PORT}`);
  });

  process.on('SIGINT', () => {
    stopWatchers.forEach((stop) => stop());
    process.exit(0);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error', err);
  process.exit(1);
});

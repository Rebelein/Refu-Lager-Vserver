import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { Server } from 'socket.io';

export function watchCollection(model: Model<any>, io: Server, channel: string) {
  // requires MongoDB replica set for change streams
  const stream = (model as any).watch([], { fullDocument: 'updateLookup' });
  stream.on('change', (change: any) => {
    switch (change.operationType) {
      case 'insert':
        io.emit(`${channel}:insert`, toClient(change.fullDocument));
        break;
      case 'update':
        io.emit(`${channel}:update`, toClient((change as any).fullDocument));
        break;
      case 'delete':
        io.emit(`${channel}:delete`, { id: toId((change as any).documentKey?._id) });
        break;
      default:
        break;
    }
  });
  return () => stream.close();
}

function toId(v: any) {
  if (typeof v === 'string') return v;
  if (v instanceof Types.ObjectId) return v.toString();
  return v;
}

function toClient(doc: any) {
  if (!doc) return null;
  const out = { ...doc } as any;
  out.id = out._id;
  delete out._id;
  return out;
}

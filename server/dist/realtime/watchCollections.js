import { Types } from 'mongoose';
export function watchCollection(model, io, channel) {
    // requires MongoDB replica set for change streams
    const stream = model.watch([], { fullDocument: 'updateLookup' });
    stream.on('change', (change) => {
        switch (change.operationType) {
            case 'insert':
                io.emit(`${channel}:insert`, toClient(change.fullDocument));
                break;
            case 'update':
                io.emit(`${channel}:update`, toClient(change.fullDocument));
                break;
            case 'delete':
                io.emit(`${channel}:delete`, { id: toId(change.documentKey?._id) });
                break;
            default:
                break;
        }
    });
    return () => stream.close();
}
function toId(v) {
    if (typeof v === 'string')
        return v;
    if (v instanceof Types.ObjectId)
        return v.toString();
    return v;
}
function toClient(doc) {
    if (!doc)
        return null;
    const out = { ...doc };
    out.id = out._id;
    delete out._id;
    return out;
}

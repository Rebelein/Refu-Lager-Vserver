import { Router } from 'express';
import type { Model } from 'mongoose';

export function createCrudRouter(model: Model<any>) {
  const router = Router();

  // list
  router.get('/', async (_req, res, next) => {
    try {
      const docs = await model.find({}).lean({ virtuals: true });
      const out = docs.map((d: any) => ({ ...d, id: d._id, _id: undefined }));
      res.json(out);
    } catch (e) { next(e); }
  });

  // get one
  router.get('/:id', async (req, res, next) => {
    try {
      const doc = await model.findById(req.params.id).lean({ virtuals: true });
      if (!doc) return res.status(404).json({ error: 'not_found' });
      const out: any = { ...doc, id: (doc as any)._id };
      delete out._id;
      res.json(out);
    } catch (e) { next(e); }
  });

  // upsert (set with merge: true semantics)
  router.put('/:id', async (req, res, next) => {
    try {
      const payload = { ...req.body };
      delete (payload as any).id;
      const doc = await model.findByIdAndUpdate(
        req.params.id,
        { $set: payload },
        { upsert: true, new: true }
      ).lean({ virtuals: true });
      const out: any = { ...doc, id: (doc as any)._id };
      delete out._id;
      res.json(out);
    } catch (e) { next(e); }
  });

  // create
  router.post('/', async (req, res, next) => {
    try {
      const payload = { ...req.body };
      if (payload.id) { payload._id = payload.id; delete payload.id; }
      const created = await model.create(payload);
      const obj = created.toJSON();
      res.status(201).json(obj);
    } catch (e) { next(e); }
  });

  // update (partial)
  router.patch('/:id', async (req, res, next) => {
    try {
      const payload = { ...req.body };
      delete (payload as any).id;
      const doc = await model.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true }).lean({ virtuals: true });
      if (!doc) return res.status(404).json({ error: 'not_found' });
      const out: any = { ...doc, id: (doc as any)._id };
      delete out._id;
      res.json(out);
    } catch (e) { next(e); }
  });

  // delete
  router.delete('/:id', async (req, res, next) => {
    try {
      await model.findByIdAndDelete(req.params.id);
      res.status(204).end();
    } catch (e) { next(e); }
  });

  return router;
}

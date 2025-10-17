import { Schema, model } from 'mongoose';
const MaskAreaSchema = new Schema({
    x: Number,
    y: Number,
    width: Number,
    height: Number,
}, { _id: false });
const WholesalerMaskSchema = new Schema({
    id: String,
    name: String,
    areas: { type: [MaskAreaSchema], default: [] },
    backgroundImage: String,
}, { _id: false });
const WholesalerSchema = new Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    masks: { type: [WholesalerMaskSchema], default: [] },
}, { versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; } } });
export const WholesalerModel = model('wholesalers', WholesalerSchema);

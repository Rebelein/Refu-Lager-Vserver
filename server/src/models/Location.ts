import { Schema, model } from 'mongoose';

const LocationSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    isVehicle: { type: Boolean, required: true },
  },
  { versionKey: false, toJSON: { transform: (_: any, ret: any) => { ret.id = ret._id; delete ret._id; } } }
);

export const LocationModel = model('locations', LocationSchema);

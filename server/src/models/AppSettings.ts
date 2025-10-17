import { Schema, model } from 'mongoose';

const AIConfigSchema = new Schema(
  {
    provider: { type: String, enum: ['google', 'openrouter'] },
    model: String,
    apiKey: String,
  },
  { _id: false }
);

const AppSettingsSchema = new Schema(
  {
    _id: { type: String, required: true }, // should be 'global'
    ai: { type: AIConfigSchema, default: undefined },
    deliveryNoteAi: { type: AIConfigSchema, default: undefined },
  },
  { versionKey: false, toJSON: { transform: (_: any, ret: any) => { ret.id = ret._id; delete ret._id; } } }
);

export const AppSettingsModel = model('app_settings', AppSettingsSchema);

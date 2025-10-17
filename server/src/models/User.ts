import { Schema, model } from 'mongoose';

const UserSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    showInventoryStatusBorder: { type: Boolean, default: undefined },
    visibleNavItems: { type: [String], default: [] },
    favoriteLocationId: { type: String, default: undefined },
    navItemOrder: { type: [String], default: [] },
    isNavSortable: { type: Boolean, default: undefined },
    isDashboardEditing: { type: Boolean, default: undefined },
  },
  {
    versionKey: false,
    toJSON: { transform: (_d: any, ret: any) => { ret.id = ret._id; delete ret._id; } },
  }
);

export const UserModel = model('users', UserSchema);

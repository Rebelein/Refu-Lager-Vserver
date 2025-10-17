import { Schema, model } from 'mongoose';
const RentedBySchema = new Schema({
    type: { type: String, enum: ['user', 'customer', 'other'] },
    id: String,
    name: String,
}, { _id: false });
const RentalHistoryEntrySchema = new Schema({
    id: String,
    type: { type: String },
    date: String,
    userId: String,
    userName: String,
    details: String,
}, { _id: false });
const ReservationSchema = new Schema({
    id: String,
    startDate: String,
    endDate: String,
    reservedFor: String,
    userId: String,
    userName: String,
}, { _id: false });
const MachineSchema = new Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    imageUrl: { type: String, default: null },
    itemType: { type: String, enum: ['machine'], required: true },
    rentalStatus: { type: String, enum: ['available', 'rented', 'in_repair', 'reserved'], default: 'available' },
    rentedBy: { type: RentedBySchema, default: null },
    rentalHistory: { type: [RentalHistoryEntrySchema], default: [] },
    needsConsumables: { type: Boolean, default: undefined },
    manufacturer: { type: String, default: undefined },
    model: { type: String, default: undefined },
    yearOfConstruction: { type: Number, default: undefined },
    lastRepair: { type: String, default: undefined },
    nextInspection: { type: String, default: undefined },
    reservations: { type: [ReservationSchema], default: [] },
    // compat fields used in UI
    stocks: { type: [Schema.Types.Mixed], default: [] },
    minStocks: { type: [Schema.Types.Mixed], default: [] },
    mainLocation: { type: String, default: '' },
    subLocation: { type: String, default: '' },
    manufacturerItemNumbers: { type: [Schema.Types.Mixed], default: [] },
    changelog: { type: [Schema.Types.Mixed], default: [] },
}, {
    versionKey: false,
    toJSON: {
        transform: (_doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
        },
    },
});
export const MachineModel = model('machines', MachineSchema);

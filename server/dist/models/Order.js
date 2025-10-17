import { Schema, model } from 'mongoose';
const OrderItemSchema = new Schema({
    itemId: String,
    itemName: String,
    itemNumber: String,
    wholesalerItemNumber: String,
    quantity: Number,
    receivedQuantity: Number,
    status: { type: String, enum: ['pending', 'commissioned', 'received'] },
    locationId: String,
}, { _id: false });
const InitiatedBySchema = new Schema({
    userId: String,
    userName: String,
}, { _id: false });
const OrderSchema = new Schema({
    _id: { type: String, required: true },
    orderNumber: { type: String, required: true },
    date: { type: String, required: true },
    wholesalerId: { type: String, required: true },
    wholesalerName: { type: String, required: true },
    items: { type: [OrderItemSchema], default: [] },
    status: { type: String, enum: ['draft', 'ordered', 'partially-received', 'received', 'partially-commissioned'], required: true },
    locationId: { type: String, default: null },
    initiatedBy: { type: InitiatedBySchema, default: null },
}, { versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; } } });
export const OrderModel = model('orders', OrderSchema);

import { Schema, model } from 'mongoose';
const ManufacturerItemNumberSchema = new Schema({
    number: { type: String, required: true },
    manufacturer: { type: String },
}, { _id: false });
const StockSchema = new Schema({
    locationId: { type: String, required: true },
    quantity: { type: Number, required: true },
}, { _id: false });
const MinStockSchema = new Schema({
    locationId: { type: String, required: true },
    quantity: { type: Number, required: true },
}, { _id: false });
const SupplierSchema = new Schema({
    wholesalerId: { type: String, required: true },
    wholesalerItemNumber: { type: String, required: true },
    url: { type: String },
}, { _id: false });
const ChangeLogEntrySchema = new Schema({
    id: String,
    date: String,
    userId: String,
    userName: String,
    type: String,
    quantity: Number,
    newStock: Number,
    details: String,
    itemId: String,
    itemName: String,
    locationId: String,
    fromLocationId: String,
    toLocationId: String,
}, { _id: false });
const ReorderStatusSchema = new Schema({
    status: { type: String, enum: ['arranged', 'ordered', null], default: null },
    arrangedAt: { type: String },
    orderedAt: { type: String },
    quantity: { type: Number },
    orderId: { type: String },
}, { _id: false });
const ArticleSchema = new Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    manufacturerItemNumbers: { type: [ManufacturerItemNumberSchema], default: [] },
    preferredManufacturerItemNumber: { type: String, default: null },
    barcode: { type: String, default: null },
    mainLocation: { type: String, required: true },
    subLocation: { type: String, required: true },
    stocks: { type: [StockSchema], default: [] },
    minStocks: { type: [MinStockSchema], default: [] },
    suppliers: { type: [SupplierSchema], default: [] },
    preferredWholesalerId: { type: String, default: null },
    imageUrl: { type: String, default: null },
    linkedImageUrl: { type: String, default: null },
    labelLastPrintedAt: { type: String, default: null },
    itemType: { type: String, enum: ['item'], required: true },
    changelog: { type: [ChangeLogEntrySchema], default: [] },
    reorderStatus: { type: Schema.Types.Mixed, default: {} },
    lastInventoriedAt: { type: Schema.Types.Mixed, default: {} },
}, {
    timestamps: false,
    versionKey: false,
    toJSON: {
        transform: (_doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
        },
    },
});
export const ArticleModel = model('articles', ArticleSchema);

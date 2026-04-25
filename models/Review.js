const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    orderId:    { type: String, required: true, unique: true },
    userId:     { type: String, required: true },
    serviceId:  { type: String, required: true },
    serviceName:{ type: String },
    ratings:    { type: mongoose.Schema.Types.Mixed, required: true }, // { cleanliness: 4, timeliness: 5, ... }
    overall:    { type: Number, required: true, min: 1, max: 5 },
    comment:    { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);

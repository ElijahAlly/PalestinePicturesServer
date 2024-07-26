const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const config = require('../config');
const url = config.mongoURIWithDB('email');
const connect = mongoose.createConnection(url);

const ReviewSchema = new Schema({
    review: {
        required: true,
        type: String,
        unique: false,
    },
    statusGiven: {
        required: true,
        type: String,
        enum: ['UNDER_REVIEW', 'REJECTED', 'CONFIRMED'],
        default: 'UNDER_REVIEW'
    },
    admin: {
        type: Schema.Types.ObjectId, 
        ref: 'Admin',
        required: true
    },
    imageId: {
        type: String, 
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now()
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
});

const Review = connect.model('Review', ReviewSchema);
module.exports = Review;
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const config = require('../config');
const url = config.mongoURIWithDB('users');
const connect = mongoose.createConnection(url);

const CodeSchema = new Schema({
    code: {
        required: true,
        type: String,
        unique: true,
    },
    frequency: {
        required: true,
        type: String,
        enum: ['daily', 'weekly', 'bi-weekly', 'monthly', 'yearly'],
        default: 'weekly'
    },
    active_since: {
        type: String,
        default: ''
    },
    active_until: {
        type: String,
        default: ''
    },
});

const Code = connect.model('Code', CodeSchema);
module.exports = Code;
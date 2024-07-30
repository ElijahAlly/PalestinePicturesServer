const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const config = require('../config');
const url = config.mongoURIWithDB('users');
const connect = mongoose.createConnection(url);

const AdminSchema = new Schema({
    email: {
        required: true,
        type: String,
        unique: true,
    },
    first_name: {
        required: true,
        type: String
    },
    last_name: {
        required: true,
        type: String
    },
    title: {
        required: false,
        type: String
    },
    password: {
        required: true,
        type: String
    },
    active: {
        required: true,
        type: String
    },
    organization: {
        required: false,
        type: String
    },
    phone: {
        required: false,
        type: String
    },
    personal_links: {
        required: false,
        type: String
    },
    createdAt: {
        default: Date.now(),
        type: Date
    },
    updatedAt: {
        default: Date.now(),
        type: Date
    },
});

const Admin = connect.model('Admin', AdminSchema);
module.exports = Admin;
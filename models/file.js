const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const config = require('../config');
const url = config.mongoURIWithDB('files');
const connect = mongoose.createConnection(url);

const FileSchema = new Schema({
    caption: {
        required: true,
        type: String
    },
    filename: {
        required: true,
        type: String
    },
    fileId: {
        required: true,
        type: String
    },
    isPerson: {
        required: true,
        type: Boolean
    },
    isLandmark: {
        required: true,
        type: Boolean
    },
    fullName: {
        required: false,
        type: String,
    },
    age: {
        required: false,
        type: Number,
        default: -1
    },
    age: {
        required: false,
        type: Number,
        default: -1
    },
    birthedOn: {
        required: false,
        type: {
            time: {
                required: false,
                type: String,
                default: ''
            },
            day: {
                required: false,
                type: String,
                default: ''
            },
            month: {
                required: false,
                type: String,
                default: ''
            },
            year: {
                required: false,
                type: String,
                default: ''
            },
        }
    },
    passedOn: {
        required: false,
        type: {
            time: {
                required: false,
                type: String,
                default: ''
            },
            day: {
                required: false,
                type: String,
                default: ''
            },
            month: {
                required: false,
                type: String,
                default: ''
            },
            year: {
                required: false,
                type: String,
                default: ''
            },
        }
    },
    locationDetails: {
        required: false,
        type: {
            geoCoordinations: {
                required: false,
                type: String,
                default: ''
            },
            location: {
                required: false,
                type: String,
                default: ''
            },
            dateCaptured: {
                required: false,
                type: {
                    time: {
                        required: false,
                        type: String,
                        default: ''
                    },
                    day: {
                        required: false,
                        type: String,
                        default: ''
                    },
                    month: {
                        required: false,
                        type: String,
                        default: ''
                    },
                    year: {
                        required: false,
                        type: String,
                        default: ''
                    },
                }
            }
        }
    },
    sources: {
        required: false,
        type: Array({
            name: {
                required: false,
                type: String,
                default: ''
            },
            link: {
                required: false,
                type: String,
                default: ''
            }
        })
    },
    status: {
        required: true,
        type: String,
        enum: ['UNDER_REVIEW', 'REJECTED', 'CONFIRMED'],
        default: 'UNDER_REVIEW'
    },
    createdAt: {
        default: Date.now(),
        type: Date
    },
});

const File = connect.model('File', FileSchema);
module.exports = File;
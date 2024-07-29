const express = require('express');
const imageRouter = express.Router();
const mongoose = require('mongoose');
const Image = require('../models/image');
const Review = require('../models/review');
const config = require('../config');
const Admin = require('../models/admin');

module.exports = (upload) => {
    const url = config.mongoURIWithDB(config.uploadDb);
    const connect = mongoose.createConnection(url);

    let gfs;

    connect.once('open', () => {
        // initialize stream
        gfs = new mongoose.mongo.GridFSBucket(connect.db, {
            bucketName: "uploads",
        });
    });

    // GET: Fetches all the files in the uploads collection
    imageRouter.route('/')
        .get(async (req, res, next) => {
            try {
                const { count, skip, isPerson, isLandmark, isConfirmed } = req.query;

                const statusArr = JSON.parse(isConfirmed) ? ["CONFIRMED"] : ["UNDER_REVIEW", "REJECTED"];

                const isPersonParsed = JSON.parse(isPerson);
                const isLandmarkParsed = JSON.parse(isLandmark);
                let fileTypeQuery = {};

                if (isPersonParsed && isLandmarkParsed) {
                    fileTypeQuery = { "$or": [{ "isPerson": isPersonParsed }, { "isLandmark": isLandmarkParsed }] }
                } else {
                    fileTypeQuery = { "isPerson": isPersonParsed, "isLandmark": isLandmarkParsed }
                }

                // console.log('fileTypeQuery: ', fileTypeQuery);

                const files = await Image.find({ ...fileTypeQuery, status: { $in: statusArr } })
                    .limit(parseInt(count))
                    .skip(parseInt(skip));

                // filter files
                // console.log('files...', files);

                if (!files || files.length === 0) {
                    return res.status(200).json({
                        success: false,
                        message: 'No files available'
                    });
                }

                const reviewsWithAdminsFull = [];
                
                await Promise.all(files.map(async (file) => {
                    try {
                        // ! Did NOT Work
                        // Review.find({ imageId: file._id })
                        // .populate('Admin')
                        // .exec()
                        // .then((reviews) => {
                        //     console.log('reviews', reviews);

                        //     return res.status(200).json({
                        //         success: true,
                        //         file,
                        //         reviews
                        //     });
                        // })

                        // ! Did NOT Work
                        // Review.aggregate([
                        //     {
                        //         $match: { imageId: file._id },
                        //     },
                        //     {
                        //         $lookup: {
                        //             from: 'admins', // Collection name for Admin
                        //             localField: 'admin',
                        //             foreignField: '_id',
                        //             as: 'adminData',
                        //         },
                        //     },
                        //     {
                        //         $unwind: '$adminData',
                        //     },
                        //     {
                        //         $project: {
                        //             review: 1,
                        //             statusGiven: 1,
                        //             admin: '$adminData', // Replace admin reference with adminData
                        //             imageId: 1,
                        //             createdAt: 1,
                        //         },
                        //     },
                        // ]).then((reviews) => {
                        //     return res.status(200).json({
                        //         success: true,
                        //         file,
                        //         reviews,
                        //     });
                        // })

                        const reviews = await Review.find({ imageId: file._id });
                        // console.log('reviews', reviews);
                        const reviewsWithAdmins = await Promise.all(reviews.map(async (review) => {
                            try {
                                const admin = await Admin.findOne({ _id: review.admin });
                                review.admin = admin;
                                return review;
                            } catch (err) {
                                // console.log('could not find admin');
                                return review;
                            }
                        }));
                        // console.log('reviewsWithAdmins', reviewsWithAdmins);

                        reviewsWithAdminsFull.push(...reviewsWithAdmins);
                    } catch (err) {
                        console.log(err);
                    }
                }));

                // console.log('reviewsWithAdminsFull', reviewsWithAdminsFull);

                res.status(200).json({
                    success: true,
                    files,
                    reviews: reviewsWithAdminsFull
                });
            } catch (err) {
                console.log(err);
                res.status(500).json({ message: 'Could not fetch Images'});
            }
    });

    // GET: Fetches a particular file by filename
    imageRouter.route('/:filename')
        .get(async (req, res, next) => {
            // console.log('getting single file by filename -> ', req.params.filename);
            try {
                const file = await Image.findOne({ filename: req.params.filename });
                if (!file) {
                    return res.status(200).json({ // try tp find a way to send 404 with frontend moving on after error
                        success: false,
                        message: 'No file found',
                    });
                }
                    
                return res.status(200).json({
                    success: true,
                    file,
                    // reviews: reviewsWithAdmins,
                });
            } catch (err) {
                console.log(err);
                res.status(500).json({ err });
            }
    });

    // GET: Fetches a particular image and render on browser
    imageRouter.route('/image/:filename')
        .get((req, res, next) => {
            // console.log('getting single image by name -> ', req.params.filename);
            gfs.find({ filename: req.params.filename }).toArray((err, files) => {
                const file = files[0];
                // console.log('file found', JSON.stringify(file));
                if (!file || files.length === 0) {
                    return res.status(200).json({
                        success: false,
                        message: 'No files available',
                    });
                }

                if (file.contentType === 'image/jpg'
                    || file.contentType === 'image/jpeg' 
                    || file.contentType === 'image/png' 
                    || file.contentType === 'image/svg+xml'
                    || file.contentType === 'image/gif'
                    || file.contentType === 'video/mp4'
                ) {
                    gfs.openDownloadStreamByName(req.params.filename).pipe(res);
                } else {
                    res.status(404).json({
                        err: 'Not an image',
                    });
                }
            });
    });

    // GET: Fetch most recently added record
    imageRouter.route('/recent')
        .get((req, res, next) => {
            // console.log('get most recently added image -> ', req.body)
            Image.findOne({}, {}, { sort: { '_id': -1 } })
                .then((image) => {
                    res.status(200).json({
                        success: true,
                        image,
                    });
                })
                .catch(err => res.status(500).json(err));
    });

    // POST: Upload a single image/file to Image collection
    imageRouter.route('/')
        .post(upload.single('file'), (req, res, next) => {
            // console.log('creating single file -> ', req.file);

            // check for existing images (Should We check based on filename as well?)
            Image.findOne({ caption: req.body.caption })
                .then((image) => {

                    // TODO: Add type field ['VIDEO', 'IMAGE', 'DOCUMENT']
                    // if (file.isVideo || file.isImage) {
                    //     next;
                    // } else if (file.contentType === 'image/jpg'
                    //     || file.contentType === 'image/jpeg'
                    //     || file.contentType === 'image/png'
                    //     || file.contentType === 'image/svg'
                    // ) {
                    //     file.isImage = true;
                    //     file.isVideo = false;
                    // } else if (file.contentType.includes('video') || file.contentType.includes('mp4')) {
                    //     file.isImage = false;
                    //     file.isVideo = true;
                    // } else {
                    //     file.isImage = false;
                    //     file.isVideo = false;
                    // }

                    if (image) {
                        // console.log('image already exists -> ', image);
                        return res.status(200).json({
                            success: false,
                            message: 'Image already exists',
                        });
                    }
                    
                    if (req.file.contentType.includes('webp')) {
                        return res.status(500).json({
                            success: false,
                            message: 'Image not a valid type',
                        });
                    }

                    const isPerson = JSON.parse(req.body.isPerson);
                    const isLandmark = JSON.parse(req.body.isLandmark);
                    const birthedOn = JSON.parse(req.body.birthedOn);
                    const passedOn = JSON.parse(req.body.passedOn);
                    const locationDetails = JSON.parse(req.body.locationDetails);
                    const sources = JSON.parse(req.body.sources);

                    let newImage = new Image({
                        filename: req.file.filename,
                        fileId: req.file.id,
                        caption: req.body.caption,
                        isPerson,
                        isLandmark,
                        birthedOn,
                        passedOn,
                        locationDetails,
                        sources,
                    });

                    // console.log('image to create -> ', newImage);
                    newImage.save()
                        .then((image) => { 
                            res.status(200).json({
                                success: true,
                                image,
                            });
                        })
                        .catch(err => res.status(500).json(err));
                })
                .catch(err => res.status(500).json(err));
    })

    // POST: Upload multiple files upto 3
    imageRouter.route('/multiple')
        .post(upload.array('file', 3), (req, res, next) => {
            // console.log('uploading multiple files (max of 3) -> ', req.files)
            res.status(200).json({
                success: true,
                message: `${req.files.length} files uploaded successfully`,
            });
    });

    // DELETE: Delete an image from the collection
    imageRouter.route('/images/:id')
        .delete((req, res, next) => {
            // console.log('deleting a single image -> ', req.params.id);
            Image.findOne({ _id: req.params.id })
                .then((image) => {
                    if (image) {
                        // console.log('found file, deleting... -> ', image);
                        Image.deleteOne({ _id: req.params.id })
                            .then(() => {
                                return res.status(200).json({
                                    success: true,
                                    message: `File with ID: ${req.params.id} deleted`,
                                });
                            })
                            .catch(err => { return res.status(500).json(err) });
                    } else {
                        res.status(200).json({
                            success: false,
                            message: `File with ID: ${req.params.id} not found`,
                        });
                    }
                })
                .catch(err => res.status(500).json(err));
    });

    // DELETE: Delete a particular file by an ID
    imageRouter.route('/:id')
        .delete((req, res, next) => {
            // console.log('deleting a single file by id -> ', req.params.id);
            gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
                if (err) {
                    return res.status(404).json({ err: err });
                }

                res.status(200).json({
                    success: true,
                    message: `File with ID ${req.params.id} is deleted`,
                });
            });
    });

    // GET: Fetches file count for a particular page
    imageRouter.route('/count/:page')
        .get((req, res, next) => {
            let reqObj = {};
            switch (req.params.page) {
                case 'ADMIN':
                    reqObj =  {
                        $or: [
                            { status: 'REJECTED' },
                            { status: 'UNDER_REVIEW' }
                        ]
                    }
                    break;

                case 'LANDMARKS':
                    reqObj = {
                        $and: [
                            { status: 'CONFIRMED' },
                            { isLandmark: true },
                            { isPerson: false },
                        ],
                    }
                    break;

                case 'PEOPLE':
                    reqObj = {
                        $and: [
                            { status: 'CONFIRMED' },
                            { isPerson: true },
                            { isLandmark: false },
                        ],
                    }
                    break;
            
                default:
                    break;
            }


            Image.countDocuments(reqObj)
                .then((count) => {
                    return res.status(200).json({
                        success: true,
                        message: `Files found`,
                        count
                    });
                })
                .catch(err => { return res.status(500).json(err) });
        });

    return imageRouter;
};
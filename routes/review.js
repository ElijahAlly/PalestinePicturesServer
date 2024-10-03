const express = require('express');
const reviewRouter = express.Router();
const Review = require('../models/review');
const Admin = require('../models/admin');
const File = require('../models/file');

// GET: Fetches all the reviews for an image
reviewRouter.route('/:fileId')
    .get((req, res) => {
        Review.find({ fileId: req.query.fileId })
            .then((reviews) => {
                if (!reviews || reviews.length === 0) {
                    return res.status(200).json({
                        success: false,
                        message: 'No reviews found'
                    });
                }

                res.status(200).json({
                    success: true,
                    reviews,
                });
            })
            .catch((err) => {
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: 'No reviews found'
                }); 
            })
    });

// POST: creates an review and assigns the image status by the majority votes
reviewRouter.route('/')
    .post(async (req, res) => {
        try {
            const {
                review,
                adminId,
                fileId,
                statusGiven,
            } = JSON.parse(req.body.data);

            await Review.create({ 
                review,
                admin: adminId,
                fileId,
                statusGiven 
            })

            const reviewsRes = await Review.find({ fileId });

            // find the new status
            // console.log('reviews', JSON.stringify(reviewsRes));
            const statusEnumCount = {
                confirmed: 0,
                rejected: 0,
                under_review: 0,
                maxStatus: statusGiven
            };

            reviewsRes.map((review) => {
                switch (review.statusGiven) {
                    case 'UNDER_REVIEW':
                        statusEnumCount.under_review += 1;
                        if (statusEnumCount.under_review > statusEnumCount.rejected
                            && statusEnumCount.under_review > statusEnumCount.confirmed
                        ) {
                            statusEnumCount.maxStatus = 'UNDER_REVIEW';
                        }
                        break;
                        
                    case 'REJECTED':
                        statusEnumCount.rejected += 1;
                        if (statusEnumCount.rejected > statusEnumCount.under_review
                            && statusEnumCount.rejected > statusEnumCount.confirmed
                        ) {
                            statusEnumCount.maxStatus = 'REJECTED';
                        }
                        break;
                        
                    case 'CONFIRMED':
                        statusEnumCount.confirmed += 1;
                        if (statusEnumCount.confirmed > statusEnumCount.under_review
                            && statusEnumCount.confirmed > statusEnumCount.rejected
                        ) {
                            statusEnumCount.maxStatus = 'CONFIRMED';
                        }
                        break;
                
                    default:
                        break;
                }
            })

            console.log('statusEnumCount', statusEnumCount);
            await File.findOneAndUpdate({ _id: fileId }, {
                status: statusEnumCount.maxStatus
            });
 
            return res.status(200).json({
                success: true,
                message: 'Review created successfully. Verify and activate the account.',
                review,
            });
        } catch (err) {
            console.error('Error creating review:', err);
            return res.status(500).json({
                success: false,
                message: 'Error creating review. Please try again later.'
            }); 
        }
    });

// PATCH: Update a particular review by id and re-assigns the image status by the majority votes
reviewRouter.route('/:id')
    .patch(async (req, res) => {
        try {
            const updateData = JSON.parse(req.body.data);

            await Review.findByIdAndUpdate(req.params.id, updateData);
            const updatedReview = await Review.findById(req.params.id);

            if (!updatedReview) {
                return res.status(300).json({
                    success: false,
                    message: 'Review not updated, Please try again',
                });
            } 

            const admin = await Admin.findOne({ _id: updatedReview.admin });
            updatedReview.admin = admin;

            const reviewsRes = await Review.find({ fileId: updatedReview.fileId });
            const statusEnumCount = {
                confirmed: 0,
                rejected: 0,
                under_review: 0,
                maxStatus: updatedReview.statusGiven
            };

            reviewsRes.map((review) => {
                switch (review.statusGiven) {
                    case 'UNDER_REVIEW':
                        statusEnumCount.under_review += 1;
                        if (statusEnumCount.under_review > statusEnumCount.rejected
                            && statusEnumCount.under_review > statusEnumCount.confirmed
                        ) {
                            statusEnumCount.maxStatus = 'UNDER_REVIEW';
                        }
                        break;

                    case 'REJECTED':
                        statusEnumCount.rejected += 1;
                        if (statusEnumCount.rejected > statusEnumCount.under_review
                            && statusEnumCount.rejected > statusEnumCount.confirmed
                        ) {
                            statusEnumCount.maxStatus = 'REJECTED';
                        }
                        break;

                    case 'CONFIRMED':
                        statusEnumCount.confirmed += 1;
                        if (statusEnumCount.confirmed > statusEnumCount.under_review
                            && statusEnumCount.confirmed > statusEnumCount.rejected
                        ) {
                            statusEnumCount.maxStatus = 'CONFIRMED';
                        }
                        break;

                    default:
                        break;
                }
            })

            await File.findByIdAndUpdate(updatedReview.fileId, {
                status: statusEnumCount.maxStatus
            });

            if (updatedReview._id) {
                return res.status(200).json({
                    success: true,
                    review: updatedReview,
                });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ err, success: false, message: 'Error during update. Please try again later.' })
        }
    });

module.exports = reviewRouter;
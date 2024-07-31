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
            console.log('updateData', updateData);

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

            console.log('statusEnumCount', statusEnumCount);
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

// POST: Login a particular admin by email
// reviewRouter.route('/:email')
//     .post(async (req, res) => {
//         try {
//             const { password, code } = JSON.parse(req.body.data);
//             const admin = await Admin.findOne({ email: req.params.email });

//             if (!admin) {
//                 return res.status(300).json({
//                     success: false,
//                     message: 'Admin not found, Please re-enter your email and try again',
//                 });
//             } 

//             // Compare the req password with the stored hashed password
//             console.log('admin', admin);
//             const passwordMatch = await bcrypt.compare(password, admin.password);

//             if (!passwordMatch) {
//                 return res.status(300).json({
//                     success: false,
//                     message: 'Incorrect password. Please re-enter your password and try again.',
//                 });
//             }

//             // confirm code is accurate and active
//             const codeData = await Code.findOne({ code });

//             if (!codeData || !codeData.id) {
//                 return res.status(300).json({
//                     success: false,
//                     message: 'Code not found in our database. Please re-enter, or check your email for a new code. We send a new one every Monday to our active admins. To check if you are active, contact us at support@palestinepictures.org',
//                 })
//             } else {
//                 // Check if code is Expired
//                 const dateArr = codeData.active_until.split('-'); // day-month-year
//                 const date = new Date();

//                 if (date.getFullYear() > parseInt(dateArr[2])) { // code from a previous year (cuurent year will never be less than a code from the db [NOT TRUE for Month/Day])
//                     return res.status(300).json({
//                         success: false,
//                         message: 'Code Expired Last Year! Please check your email for a new code. We send a new one every Monday to our active admins. To check if you are active, contact us at support@palestinepictures.org',
//                     }) 
//                 } else if (date.getFullYear() === parseInt(dateArr[2]) && (date.getMonth() + 1) > parseInt(dateArr[1])) { // code is from current year, but from a previous month
//                     return res.status(300).json({
//                         success: false,
//                         message: 'Code Expired Last Month! Please check your email for a new code. We send a new one every Monday to our active admins. To check if you are active, contact us at support@palestinepictures.org',
//                     })
//                 } else if (date.getFullYear() === parseInt(dateArr[2]) && (date.getMonth() + 1) === parseInt(dateArr[1]) && date.getDate() > parseInt(dateArr[0])) { // code is from current year and month, but from a previous day/week
//                     return res.status(300).json({
//                         success: false,
//                         message: `Code Expired Last ${codeData.frequency === 'WEEKLY' ? 'Week' : 'Month'}! Please check your email for a new code. We send a new one every Monday to our active admins. To check if you are active, contact us at support@palestinepictures.org`,
//                     })
//                 }
//             }
            
//             if (codeData.code === code) {
//                 return res.status(200).json({
//                     success: true,
//                     admin,
//                 });
//             }
//         } catch (err) {
//             console.error(err);
//             res.status(500).json({ err, success: false, message: 'Error during login. Please try again later.' })
//         }
//     });

// DELETE: Delete a particular admin by id
// reviewRouter.route('/:id')
//     .delete(async (req, res) => {
//         try {
//             await Admin.findByIdAndDelete(req.params.id,);
//             return res.status(200).json({ success: true });
//         } catch (err) {
//             console.error(err);
//             res.status(500).json({ err, success: false, message: 'Error during update. Please try again later.' })
//         }
//     });

module.exports = reviewRouter;
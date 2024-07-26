const express = require('express');
const bcrypt = require('bcrypt');
const adminRouter = express.Router();
const Admin = require('../models/admin');
const Code = require('../models/code');

// GET: Fetches all the admins
adminRouter.route('/')
    .get((req, res) => {
        Admin.find()
            .then((admins) => {
                if (!admins || admins.length === 0) {
                    return res.status(200).json({
                        success: false,
                        message: 'No admins found'
                    });
                }

                res.status(200).json({
                    success: true,
                    admins,
                });
            })
            .catch((err) => {
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: 'No admins found'
                }); 
            })
    });

// POST: creates an admin (Will NOT be active. Will need to be verified then activated)
adminRouter.route('/')
    .post(async (req, res) => {
        try {
            const {
                email,
                password,
                first_name,
                last_name,
                title,
                active,
                organization,
                phone,
                personal_links,
                createdAt,
            } = JSON.parse(req.body.data);

            // Check if admin already exists with the given email
            const existingAdmin = await Admin.findOne({ email });
            if (existingAdmin) {
                return res.status(300).json({
                    success: false,
                    message: 'Admin already created with this email. Please login or use another email and try again.',
                });
            }

            let hashedPassword = '';
            // Generate a salt (a random string) to use during hashing
            const saltRounds = 12; // Adjust the number of rounds (higher is more secure but slower)
            bcrypt.genSalt(saltRounds, (err, salt) => {
                if (err) {
                    console.error('Error generating salt:', err);
                    return res.status(300).json({
                        success: false,
                        message: 'Error encrypting password. Please try again later.',
                    });
                } else {
                    // Hash the password using the generated salt
                    bcrypt.hash(password, salt, (err, hash) => {
                        if (err) {
                            console.error('Error hashing password:', err);
                            return res.status(300).json({
                                success: false,
                                message: 'Error encrypting password. Please try again later.',
                            });
                        } else {
                            console.log('Hashed password:', hash);
                            hashedPassword = hash; 

                            // Create a new admin
                            Admin.create({
                                email,
                                password: hashedPassword,
                                first_name,
                                last_name,
                                title,
                                active,
                                organization,
                                phone,
                                personal_links,
                                createdAt
                            })
                            .then((admin) => {
                                console.log('admin created', admin);
                                return res.status(201).json({
                                    success: true,
                                    message: 'Admin created successfully. Verify and activate the account.',
                                    admin: admin,
                                });
                            })
                            .catch((err) => {
                                console.error(err)
                                return res.status(500).json({
                                    success: false,
                                    message: 'Error creating admin. Please try again later.'
                                });  
                            })
                        }
                    });
                }
            });

        } catch (err) {
            console.error('Error creating admin:', err);
            return res.status(500).json({
                success: false,
                message: 'Error creating admin. Please try again later.'
            }); 
        }
    });

// PATCH: Update a particular admin by id
adminRouter.route('/:id')
    .patch(async (req, res) => {
        try {
            const updateData = JSON.parse(req.body.data);
            console.log('updateData', updateData);

            await Admin.findByIdAndUpdate(req.params.id, updateData);
            const updatedAdmin = await Admin.findById(req.params.id);
            console.log('admin', updatedAdmin);

            if (!updatedAdmin) {
                return res.status(300).json({
                    success: false,
                    message: 'Admin not updated, Please try again',
                });
            } 

            if (updatedAdmin._id) {
                return res.status(200).json({
                    success: true,
                    admin: updatedAdmin,
                });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ err, success: false, message: 'Error during update. Please try again later.' })
        }
    });

// POST: Login a particular admin by email OR get updated info for refresh if already logged in
adminRouter.route('/:email')
    .post(async (req, res) => {
        try {
            const { password, code } = JSON.parse(req.body.data);
            const admin = await Admin.findOne({ email: req.params.email });

            if (!admin) {
                return res.status(300).json({
                    success: false,
                    message: 'Admin not found, Please re-enter your email and try again',
                });
            } 

            if (!password && !code) {
                // return updated admin info if admin is already logged in
                return res.status(200).json({
                    success: true,
                    admin,
                });
            }

            // Compare the req password with the stored hashed password
            console.log('admin', admin);
            const passwordMatch = await bcrypt.compare(password, admin.password);

            if (!passwordMatch) {
                return res.status(300).json({
                    success: false,
                    message: 'Incorrect password. Please re-enter your password and try again.',
                });
            }

            // confirm code is accurate and active
            const codeData = await Code.findOne({ code });

            if (!codeData || !codeData.id) {
                return res.status(300).json({
                    success: false,
                    message: 'Code not found in our database. Please re-enter, or check your email for a new code. We send a new one every Monday to our active admins. To check if you are active, contact us at support@palestinepictures.org',
                })
            } else {
                // Check if code is Expired
                const dateArr = codeData.active_until.split('-'); // day-month-year
                const date = new Date();

                if (date.getFullYear() > parseInt(dateArr[2])) { // code from a previous year (cuurent year will never be less than a code from the db [NOT TRUE for Month/Day])
                    return res.status(300).json({
                        success: false,
                        message: 'Code Expired Last Year! Please check your email for a new code. We send a new one every Monday to our active admins. To check if you are active, contact us at support@palestinepictures.org',
                    }) 
                } else if (date.getFullYear() === parseInt(dateArr[2]) && (date.getMonth() + 1) > parseInt(dateArr[1])) { // code is from current year, but from a previous month
                    return res.status(300).json({
                        success: false,
                        message: 'Code Expired Last Month! Please check your email for a new code. We send a new one every Monday to our active admins. To check if you are active, contact us at support@palestinepictures.org',
                    })
                } else if (date.getFullYear() === parseInt(dateArr[2]) && (date.getMonth() + 1) === parseInt(dateArr[1]) && date.getDate() > parseInt(dateArr[0])) { // code is from current year and month, but from a previous day/week
                    return res.status(300).json({
                        success: false,
                        message: `Code Expired Last ${codeData.frequency === 'WEEKLY' ? 'Week' : 'Month'}! Please check your email for a new code. We send a new one every Monday to our active admins. To check if you are active, contact us at support@palestinepictures.org`,
                    })
                }
            }
            
            if (codeData.code === code) {
                return res.status(200).json({
                    success: true,
                    admin,
                });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ err, success: false, message: 'Error during login. Please try again later.' })
        }
    });



// DELETE: Delete a particular admin by id
adminRouter.route('/:id')
    .delete(async (req, res) => {
        try {
            await Admin.findByIdAndDelete(req.params.id,);
            return res.status(200).json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ err, success: false, message: 'Error during update. Please try again later.' })
        }
    });

module.exports = adminRouter;
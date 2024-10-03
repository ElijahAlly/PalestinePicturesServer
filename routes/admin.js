const express = require('express');
const nodemailer = require('nodemailer');
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

// Forgot Password
adminRouter.route('/send-forgot-password-email')
    .post(async (req, res) => {
        try {
            const { to, subject, text } = JSON.parse(req.body.data);
            
            if (!to) {
                return res.status(501).send({ message: 'Must include email to send to.' });
            } else if (!subject) {
                return res.status(501).send({ message: 'Must include in subject for email.' });
            } else if (!text) {
                return res.status(501).send({ message: 'Must include text for email.' });
            }

            const adminRes = await Admin.find({ email: to });
            let newText = '';

            if (adminRes.length === 0) {
                return res.status(501).send({ message: 'Admin not found with provided email: `' + to + '` Please include valid email you created your account with.' }); 
            } else {
                if (adminRes[0].active !== 'TRUE') {
                    return res.status(401).send({ message: 'Admin not Active. Please contact support to reactivate your account: support@palestinepictures.org' });
                }
                newText = text + '_' + adminRes[0]._id
            }

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.SUPPORT_EMAIL || '',
                    pass: process.env.SUPPORT_EMAIL_PASSWORD || '',
                },
            });

            const mailOptions = {
                from: process.env.SUPPORT_EMAIL || '',
                to,
                subject,
                text: newText,
            };

            await transporter.sendMail(mailOptions);

            res.status(200).send({ message: 'Email sent successfully!' });
        } catch (error) {
            res.status(500).send({ message: 'Error sending email', error });
        }
    })

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

            if (updateData.password) {
                // Generate a salt (a random string) to use during hashing
                const saltRounds = 12; // Adjust the number of rounds (higher is more secure but slower)
                bcrypt.genSalt(saltRounds, (err, salt) => {
                    if (err) {
                        return res.status(300).json({
                            success: false,
                            message: 'Error encrypting password. Please try again later.',
                        });
                    } else {
                        // Hash the password using the generated salt
                        bcrypt.hash(updateData.password, salt, async (err, hash) => {
                            if (err) {
                                return res.status(300).json({
                                    success: false,
                                    message: 'Error encrypting password. Please try again later.',
                                });
                            } else {
                                updateData.password = hash;
                                await Admin.findByIdAndUpdate(req.params.id, updateData);
                                const updatedAdmin = await Admin.findById(req.params.id);

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
                            }
                        });
                    }
                });
            } else {
                await Admin.findByIdAndUpdate(req.params.id, updateData);
                const updatedAdmin = await Admin.findById(req.params.id);
    
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
            } else if (!codeData.active) {
                return res.status(300).json({
                    success: false,
                    message: 'Code Expired! Please check your email for a new code. We send a new one every Sunday at midnight to our active admins. To check if you are active, contact us at support@palestinepictures.org',
                }) 
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
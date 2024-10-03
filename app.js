require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const methodOverride = require('method-override');
const config = require('./config');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const crypto = require('crypto');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const fileRouter = require('./routes/file');
const adminRouter = require('./routes/admin');
const codeRouter = require('./routes/code');
const reviewRouter = require('./routes/review');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors({ origin: process.env.ORIGIN || '*' }));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

const mongoose = require('mongoose');
const Admin = require('./models/admin');
const Code = require('./models/code');
mongoose.Promise = require('bluebird');

const url = config.mongoURI;
const uploadDb = config.uploadDb;

const [baseUri, queryParams] = url.split('/?');

// Individual database URIs
const dbURIs = {
    admin: `${baseUri}/admin?${queryParams}`,
    palestine_files: `${baseUri}/palestine_files?${queryParams}`,
    files: `${baseUri}/files?${queryParams}`,
};

// Create connections
const connections = {};

const connectToDatabase = async (dbName) => {
    try {
        const dbURI = dbURIs[dbName];
        // Create a new connection
        const connection = mongoose.createConnection(dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            useFindAndModify: false
        });

        // Store the connection in the connections object
        connections[dbName] = connection;

        // Optionally listen to connection events
        connection.on('connected', () => {
            console.log(`Connected to ${dbName} database`);
        });

        connection.on('error', (err) => {
            console.error(`Connection error to ${dbName} database:`, err);
        });

        // Use the connection
        return connection;
    } catch (error) {
        console.error(`Failed to connect to ${dbName} database:`, error);
    }
};

connectToDatabase('admin');
connectToDatabase('palestine_files');
connectToDatabase('files');

/* 
    GridFs Configuration
*/

// create storage engine
const storage = new GridFsStorage({
    url: config.mongoURIWithDB(uploadDb),
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };

                // console.log('fileInfo in storage -> ', fileInfo);
                resolve(fileInfo);
            });
        });
    }
});

const upload = multer({ storage });

app.use('/files', fileRouter(upload));
app.use('/admins', adminRouter);
app.use('/codes', codeRouter);
app.use('/reviews', reviewRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

const generateSecureCode = () => {
  // Generate 16 random bytes and convert them to a hexadecimal string
  return crypto.randomBytes(16).toString('hex').toUpperCase();
};

const sendEmail = async (adminEmails, newCode) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SUPPORT_EMAIL || '',
            pass: process.env.SUPPORT_EMAIL_PASSWORD || '',
        },
    });

    const mailOptions = {
        from: process.env.SUPPORT_EMAIL,
        to: adminEmails.join(','),
        subject: `1 New Weekly Admin Code for ${new Date().toDateString()}`,
        text: `Your new admin code is: ${newCode}`,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending emails:', error);
    }
};

// Cron job to run every Sunday at midnight
cron.schedule('0 0 * * 0', async () => {
    const newCode = generateSecureCode();

    // Find all active admins
    const admins = await Admin.find({ active: 'TRUE' });
    const curDate = new Date();
    const oneWeekFromCurDate = curDate;
    oneWeekFromCurDate.setDate(oneWeekFromCurDate.getDate() + 7);

    await Code.findOneAndUpdate({ active: true }, { active: false })

    await Code.create({
        code: newCode,
        frequency: 'weekly',
        active: true,
    })

    const adminEmails = admins.map(admin => admin.email);

    // Send emails to active admins
    await sendEmail(adminEmails, newCode);
});

module.exports = app;
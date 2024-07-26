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

const fileRouter = require('./routes/file');
const adminRouter = require('./routes/admin');
const codeRouter = require('./routes/code');

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
const reviewRouter = require('./routes/review');
mongoose.Promise = require('bluebird');

const url = config.mongoURI;
const uploadDb = config.uploadDb;

console.time('Connected to MongoDB: PalestinePictures in');


const adminURI = `${url}/email`;
const palistineFilesURI = `${url}/palestine_files`;
const testURI = `${url}/test`;

const connectToDatabase = (dbURI) => {
    mongoose.connect(dbURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log(`Connected to ${dbURI}`))
    .catch(err => console.error(`Connection error to ${dbURI}:`, err));
};

connectToDatabase(adminURI);
connectToDatabase(palistineFilesURI);
connectToDatabase(testURI);

/* 
    GridFs Configuration
*/

// create storage engine
const storage = new GridFsStorage({
    url: config.mongoURIWithDB(uploadDb),
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            console.log('in storage file -> ', file);
            console.log('in storage path -> ', file.path);
            console.log('in storage buffer -> ', file.buffer);
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

module.exports = app;
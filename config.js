module.exports = {
    mongoURI: process.env.MONGO_URI || 'mongodb+srv://elijahally:jEnFeNkaACqAgQcm@cluster0.hiuzzbf.mongodb.net',
    mongoURIWithDB: (dbString) => process.env.MONGO_URI ? (
        process.env.MONGO_URI.split('/?')[0] + dbString + '/?' + process.env.MONGO_URI.split('/?')[1]
    ) : (
            `mongodb+srv://elijahally:jEnFeNkaACqAgQcm@cluster0.hiuzzbf.mongodb.net/${dbString}`
    ),
    secretOrKey: process.env.SECRET_OR_KEY || 'and198!390QE8Wlkji',
    uploadDb: process.env.UPLOAD_DB || 'palestine_files',
    userDb: process.env.USER_DB || 'user',
    emailDb: process.env.EMAIL_DB || 'emails',
};

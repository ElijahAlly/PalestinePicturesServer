module.exports = {
    mongoURI: process.env.MONGO_URI,
    mongoURIWithDB: (dbString) => {
        const [baseUri, queryParams] =  process.env.MONGO_URI.split('/?');
        return `${baseUri}/${dbString}?${queryParams}`;
    },
    secretOrKey: process.env.SECRET_OR_KEY || 'and198!390QE8Wlkji',
    uploadDb: process.env.UPLOAD_DB || 'palestine_files',
    usersDb: process.env.USER_DB || 'users',
};

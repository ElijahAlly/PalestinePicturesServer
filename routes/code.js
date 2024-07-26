const express = require('express');
const codeRouter = express.Router();
const Code = require('../models/code');

module.exports = () => {
    // GET: Fetch most recently added code
    codeRouter.route('/latest')
        .get((req, res, next) => {
            Code.findOne({}, {}, { sort: { '_id': -1 } })
                .then((code) =>
                {
                    res.status(200).json({
                        success: true,
                        code,
                    });
                })
                .catch(err => res.status(500).json(err));
        });
}
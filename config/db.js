const mongoose = require('mongoose');
module.exports = async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://review-db:27017/review_db');
    console.log('[review-service] MongoDB connected');
};

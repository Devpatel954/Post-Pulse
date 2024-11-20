const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
        },
    ],
    comments: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
            text: { type: String, required: true },
            date: { type: Date, default: Date.now },
        },
    ],
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('post', postSchema);



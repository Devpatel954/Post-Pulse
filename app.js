const express = require('express');
const app = express();
const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const JWT_SECRET = "fffffff";

// Middleware for authentication
function authenticateUser(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.redirect('/');

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.redirect('/');
        req.user = decoded;
        next();
    });
}


// Combined Login and Registration Page
app.get('/', (req, res) => {
    const token = req.cookies.token;
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (!err) return res.redirect('/profile');
        });
    }
    res.render('index');
});

// Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await userModel.findOne({ email });
        if (!user) return res.status(404).send("User not found");

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).send("Invalid password");

        const token = jwt.sign({ userid: user._id }, JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token);
        res.redirect('/profile');
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).send("Error logging in");
    }
});

// Registration Route
app.post('/register', async (req, res) => {
    const { username, name, age, email, password } = req.body;

    try {
        const existingUser = await userModel.findOne({ email });
        if (existingUser) return res.status(400).send("User already registered");

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await userModel.create({ username, name, age, email, password: hashedPassword });

        const token = jwt.sign({ userid: user._id }, JWT_SECRET);
        res.cookie('token', token);
        res.redirect('/profile');
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).send("Error registering");
    }
});

// Profile Page
app.get('/profile', authenticateUser, async (req, res) => {
    try {
        const user = await userModel.findById(req.user.userid);
        const posts = await postModel.find({ user: user._id }).sort({ updatedAt: -1 });

        res.render('profile', { user, posts });
    } catch (error) {
        console.error("Error loading profile:", error);
        res.status(500).send("Error loading profile");
    }
});

// Create Post
app.post('/post', authenticateUser, async (req, res) => {
    const { content } = req.body;

    if (!content || content.trim() === '') {
        return res.status(400).send("Post content cannot be empty");
    }

    try {
        const post = await postModel.create({
            user: req.user.userid,
            content,
        });

        res.redirect('/profile');
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).send("Error creating post");
    }
});

// Like Post
app.post('/like/:id', authenticateUser, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id);
        if (!post) return res.status(404).send("Post not found");

        const userId = req.user.userid;
        if (post.likes.includes(userId)) {
            // Unlike the post
            post.likes = post.likes.filter(id => id.toString() !== userId);
        } else {
            // Like the post
            post.likes.push(userId);
        }

        await post.save();
        res.redirect('/profile');
    } catch (error) {
        console.error("Error liking post:", error);
        res.status(500).send("Error liking post");
    }
});

// Update Post
app.post('/update/:id', authenticateUser, async (req, res) => {
    const { content } = req.body;

    if (!content || content.trim() === '') {
        return res.status(400).send("Post content cannot be empty");
    }

    try {
        const post = await postModel.findById(req.params.id);
        if (!post) return res.status(404).send("Post not found");
        if (post.user.toString() !== req.user.userid) return res.status(403).send("Unauthorized");

        post.content = content;
        post.updatedAt = new Date();
        await post.save();
        res.redirect('/profile');
    } catch (error) {
        console.error("Error updating post:", error);
        res.status(500).send("Error updating post");
    }
});

// Delete Post
app.post('/delete/:id', authenticateUser, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id);
        if (!post) return res.status(404).send("Post not found");
        if (post.user.toString() !== req.user.userid) return res.status(403).send("Unauthorized");

        await post.deleteOne();
        res.redirect('/profile');
    } catch (error) {
        console.error("Error deleting post:", error);
        res.status(500).send("Error deleting post");
    }
});

// Logout
app.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

// Start Server
app.listen(5000, () => {
    console.log("Server is running");
});






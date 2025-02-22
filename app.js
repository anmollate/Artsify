const express = require('express');
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const session = require("express-session");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require("dotenv").config();

const mongoURI = process.env.MONGO_URI || 'mongodb+srv://Artistry:Artistry1125@cluster0.5um3y.mongodb.net/artistry?retryWrites=true&w=majority';

const app = express();

// Connect to MongoDB
mongoose.connect(mongoURI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => {
        console.error("MongoDB Connection Error:", err);
        process.exit(1);
    });

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true }
}));

// Set EJS as templating engine
app.set('view engine', 'ejs');

// User Schema
const userSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true, required: true },
    password: String,
    resetToken: String,
    resetTokenExpiry: Date
}, { collection: 'signin_users' });

const User = mongoose.model("User", userSchema);

// Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Routes
app.get('/', (req, res) => {
    res.render('Login', { title: 'Login', error: null });
});

app.get('/about', (req, res) => {
    res.render('Aboutus', { title: 'About Us' });
});

app.get("/signup", (req, res) => {
    res.render("signup", { error: null });
});

app.post("/signup", async (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.render("signup", { error: "All fields are required!" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.render("signup", { error: "Email already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.redirect('/');
});

app.get('/forgot', (req, res) => {
    res.render('Forgot', { title: 'Forgot Password', error: null });
});

app.post('/forgot', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('Forgot', { title: 'Forgot Password', error: "Email not found" });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        user.resetToken = hashedToken;
        user.resetTokenExpiry = Date.now() + 3600000; // Token valid for 1 hour
        await user.save();

        const resetLink = `http://localhost:1125/reset/${resetToken}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Password Reset Request",
            html: `<p>Click the link below to reset your password:</p>
                   <a href="${resetLink}">${resetLink}</a>
                   <p>This link will expire in 1 hour.</p>`
        });

        res.render('Forgot', { title: 'Forgot Password', error: "Password reset link sent! Check your email." });
    } catch (error) {
        console.error(error);
        res.render('Forgot', { title: 'Forgot Password', error: "Something went wrong. Try again." });
    }
});

app.get('/reset/:token', async (req, res) => {
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({ resetToken: hashedToken, resetTokenExpiry: { $gt: Date.now() } });

    if (!user) {
        return res.render('404');
    }

    res.render('ResetPassword', { title: 'Reset Password', token: req.params.token });
});

app.post('/reset/:token', async (req, res) => {
    const { password } = req.body;
    try {
        const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
        const user = await User.findOne({ resetToken: hashedToken, resetTokenExpiry: { $gt: Date.now() } });

        if (!user) {
            return res.render('404');
        }

        user.password = await bcrypt.hash(password, 10);
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.render('ResetPassword', { title: 'Reset Password', error: "Something went wrong. Try again." });
    }
});

// Start server
const PORT = process.env.PORT || 1125;
app.listen(PORT, () => {
    console.log(`Server Listening At: http://localhost:${PORT}`);
});

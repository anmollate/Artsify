const express = require('express');
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const session = require("express-session");
require("dotenv").config();

const mongoURI = process.env.MONGO_URI || 'mongodb+srv://Artistry:Artistry1125@cluster0.5um3y.mongodb.net/artistry?retryWrites=true&w=majority';

const app = express();

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => {
        console.error("MongoDB Connection Error:", err);
        process.exit(1);
    });

// Middleware
app.use(express.static(__dirname + '/public'));
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
app.set('views', __dirname + '/views');

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    password: String
}, { collection: 'signin_users' });

const User = mongoose.model("User", userSchema);

// Routes
app.get("/", (req, res) => {
    res.render("Login", { title: "Login", error: null });
});

app.post("/", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render("Login", { title: "Login", error: "All fields are required!" });
    }

    const user = await User.findOne({ username });
    if (!user) {
        return res.render("Login", { title: "Login", error: "Invalid username or password!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.render("Login", { title: "Login", error: "Invalid username or password!" });
    }

    // Store user session
    req.session.user = { id: user._id, username: user.username };

    res.redirect("/homepage");
});

// Home route after login
app.get("/homepage", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/");
    }
    res.render("homepage", { title: "Home", user: req.session.user });
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

    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.render("signup", { error: "Username already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.redirect('/');
});

// Start server
const PORT = process.env.PORT || 1125;
app.listen(PORT, () => {
    console.log(`Server Listening At: http://localhost:${PORT}`);
});

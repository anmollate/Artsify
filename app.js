const express = require('express');
const fs = require("fs");
const path = require("path"); 
const mongoose = require("mongoose");
const multer = require('multer');
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const session = require("express-session");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
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


const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    // bio: { type: String, required: false },
    // age: { type: Number, required: false },
    // profileImage: { type: String }, // Stores image URL or base64-encoded string
    password: { type: String, required: true }, // Ensure password is required
    resetToken: String,  // Added for password reset
    resetTokenExpiry: Date
}, { collection: 'signin_users' });


const User = mongoose.model("User", userSchema);

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10), // Ensure it's a number
    secure: process.env.EMAIL_SECURE === 'true', // Should be false for port 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false // Allow self-signed certificates (Optional)
    }
});

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



    // Send Welcome Email
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: newUser.email,  // Corrected this
        subject: "Welcome to Artistry",
        html: `<p>Hello ${newUser.username},</p>
               <p>Thank you for signing up! Welcome to Artistry. You can now log in and explore. 😊🎨</p>
               <p>Best Regards,</p>
               <p>Artistry Team</p>`
    });

    res.redirect('/');
});

// Forgot Password Route
app.get("/forgot", (req, res) => {
    res.render("Forgot", { title: 'Forgot Password', error: null });
});

app.post('/forgot', async (req, res) => {
    const { email } = req.body;  

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.render('Forgot', { title: 'Forgot Password', error: "Email not found" });
        }

        // Generate a password reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        // Store token in database
        user.resetToken = hashedToken;
        user.resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry
        await user.save();

        // Construct reset link
        const resetLink = `http://localhost:1125/reset/${resetToken}`;

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT, 10), // Ensure it's a number
            secure: process.env.EMAIL_SECURE === 'true', // Should be false for port 587
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false // Allow self-signed certificates (Optional)
            }
        });
        

        // Send Password Reset Email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Password Reset Request",
            html: `<p>Hello ${user.username},</p>
                   <p>Click the link below to reset your password:</p>
                   <a href="${resetLink}">${resetLink}</a>
                   <p>This link will expire in 1 hour.</p>`
        });

        res.render('Forgot', { title: 'Forgot Password', error: "Password reset link sent! Check your email." });

    } catch (error) {
        console.error(error);
        res.render('Forgot', { title: 'Forgot Password', error: "Something went wrong. Try again." });
    }
});

app.get('/contact', (req, res) => {
    res.render('contact', { title: 'Contact Us' });
});
app.post("/send-email", async (req, res) => {
    const { name, email, subject, message } = req.body;

    const mailOptions = {
        from: email,
        to: "artistry1125@gmail.com",
        subject: `New Contact Form Submission: ${subject}`,
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: "Email sent successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Email failed to send.", error });
    }
});

app.get('/shop', (req, res) => {
    res.render('shop', { title: 'Shop' });
});

app.get('/cart', (req, res) => {
    res.render('cart', { title: 'Cart' });
});

app.get("/categories", (req, res) => {
    res.render("categories");
});

// API route to fetch products by category
app.get("/api/products/:category", (req, res) => {
    const category = req.params.category;

    // Read JSON file
    fs.readFile(path.join(__dirname, "data/products.json"), "utf8", (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        const products = JSON.parse(data);
        const filteredProducts = products.filter(product => product.category === category);

        res.json(filteredProducts);
    });
});


// Start server
const PORT = process.env.PORT || 1125;
app.listen(PORT, () => {
    console.log(`Server Listening At: http://localhost:${PORT}`);
});

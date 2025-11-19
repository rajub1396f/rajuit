const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const cors = require("cors");
const bcrypt = require('bcrypt');
const { match } = require("assert");


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use(express.static(__dirname + '/project')); //folder name

// ✅ SESSION SETUP (IMPORTANT)
app.use(session({
    secret: "yoursecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,     // ✅ must be false for localhost (http)
        httpOnly: true,
        sameSite: "lax",
    }
}));

// ✅ MySQL Connection
//const db = mysql.createConnection({
//    host: "localhost",
//    user: "root",
//    password: "",
//    database: "usersdb"
//});

//db.connect((err) => {
//    if (err) throw err;
//    console.log("✅ MySQL Connected Successfully");
//});

// ✅ Neon Database
const { Client, Client } = require('pg');
require('dotenv').config();

const Client = new Client({
  connectionString: process.env.psql_connectionstring,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log('Connected to Neon DB!'))
  .catch(err => console.error('DB connection error:', err));


// ✅ Register Route
app.post('/register', async (req, res) => {
  const { name, email, password, confirmPassword, phone } = req.body;
  console.log(req.body);

  // Check password match
  //if (password!== confirmPassword) {
    //return res.send('Password and Confirm Password do not match');
  //}


  try {
    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = "INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)";
    db.query(sql, [name, email, hashedPassword, phone], (err, result) => {
      if (err) {
        console.log("Database insert error:", err);
        return res.send("Registration failed");
      }
      return res.redirect('/index.html?msg=success');
    });

  } catch (error) {
    console.log("Hash error:", error);
    res.json({ status: "error", message: "Server error" });
  }
});


// ✅ Login Route
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) throw err;

        // If no user found
        if (results.length === 0) {
            return res.send('Invalid Email or Password');
        }

        // Compare password
        bcrypt.compare(password, results[0].password, (err, match) => {
            if (err) throw err;

            if (match) {
                // Save Session
                req.session.user = {
                    id: results[0].id,
                    email: results[0].email
                };

                return res.redirect('/dashboard');
            } else {
                return res.send('Invalid Email or Password');
            }
        });
    });
});


// ✅ Middleware to protect dashboard
function checkLogin(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect("/");  // redirect to homepage (login popup)
    }
}

// ✅ DASHBOARD Route (Protected)
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    res.sendFile(__dirname + '/dashboard.html');
});


// ✅ LOGOUT Route
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/"); // back to home where login popup is
    });
});


// ✅ DEFAULT HOME PAGE
app.get("/", (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    } 
    //Not logged in, show index page
    res.sendFile(__dirname + '/index.html');
});


app.post("/login", (req, res) => {
    //after login success:
    req.session.user=userData;
    res.redirect("/");
});

// ✅ Start Server
//app.listen(5500, () => {
//    console.log("🚀 Server running at http://localhost:5500");
//});

const PORT = process.env.PORT || 5500;

app.listen(PORT, () => {
    console.log('Server running on port: ${PORT}');
});
// const express = require('express');
// const cors = require('cors');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const nodemailer = require('nodemailer');
// const PDFDocument = require('pdfkit');
// const { checkAndInitializeDatabase } = require('./database');

// const app = express();
// const PORT = 3000;
// const JWT_SECRET = 'your_super_secret_key'; // Use a more secure key in production

// app.use(cors());
// app.use(express.json());

// let db;

// // Middleware to verify JWT
// const authenticateToken = (req, res, next) => {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1];
//     if (token == null) return res.sendStatus(401);

//     jwt.verify(token, JWT_SECRET, (err, user) => {
//         if (err) return res.sendStatus(403);
//         req.user = user;
//         next();
//     });
// };

// // --- AUTH ROUTES ---
// app.post('/api/register', (req, res) => {
//     const { username, email, password } = req.body;
//     const hashedPassword = bcrypt.hashSync(password, 8);
//     db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword], function(err) {
//         if (err) return res.status(500).send({ message: "Username or email already exists." });
//         res.status(201).send({ message: "User registered successfully!" });
//     });
// });

// app.post('/api/login', (req, res) => {
//     const { username, password } = req.body;
//     db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
//         if (err) return res.status(500).send({ message: "Server error" });
//         if (!user) return res.status(404).send({ message: "User not found." });

//         const passwordIsValid = bcrypt.compareSync(password, user.password);
//         if (!passwordIsValid) return res.status(401).send({ message: "Invalid Password!" });

//         const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: 86400 }); // 24 hours
//         res.status(200).send({ username: user.username, token: token });
//     });
// });

// // --- QUIZ ROUTES ---
// app.get('/api/questions/:level', authenticateToken, (req, res) => {
//     const { level } = req.params;
//     db.all('SELECT id, question, optionA, optionB, optionC, optionD FROM questions WHERE level = ? ORDER BY RANDOM() LIMIT 5', [level], (err, rows) => {
//         if (err) return res.status(500).send({ message: "Could not fetch questions." });
//         res.json(rows);
//     });
// });

// app.post('/api/submit', authenticateToken, (req, res) => {
//     const { level, userAnswers } = req.body;
//     const userId = req.user.id;
//     const questionIds = Object.keys(userAnswers);
//     if (questionIds.length === 0) {
//          return res.status(200).json({ score: 0, total: 0, remarks: "No answers submitted.", correctAnswers: {} });
//     }

//     const placeholders = questionIds.map(() => '?').join(',');
//     const sql = `SELECT id, correct_option FROM questions WHERE id IN (${placeholders})`;

//     db.all(sql, questionIds, (err, correctAnswersRows) => {
//         if (err) return res.status(500).json({ message: "Error fetching answers" });

//         let score = 0;
//         const correctAnswers = {};
//         correctAnswersRows.forEach(row => {
//             correctAnswers[row.id] = row.correct_option;
//             if (userAnswers[row.id] === row.correct_option) {
//                 score++;
//             }
//         });

//         const totalQuestions = correctAnswersRows.length;
//         db.run('INSERT INTO results (user_id, level, score, total_questions) VALUES (?, ?, ?, ?)', [userId, level, score, totalQuestions], function(err) {
//             if (err) {
//                 console.error("Error saving result:", err);
//                 return res.status(500).json({ message: "Error saving result." });
//             }
//             const percentage = totalQuestions > 0 ? (score / totalQuestions) : 0;
//             const remarks = percentage >= 0.8 ? "Excellent!" : (percentage >= 0.6 ? "Good Job!" : "Needs Improvement");
//             res.json({ score, total: totalQuestions, remarks, correctAnswers });
//         });
//     });
// });

// // --- RESULTS/SUMMARY ROUTES ---
// app.get('/api/results', authenticateToken, (req, res) => {
//     db.all('SELECT DISTINCT level FROM results WHERE user_id = ?', [req.user.id], (err, rows) => {
//         if (err) return res.status(500).send({ message: "Error fetching results." });
//         res.json(rows);
//     });
// });

// app.get('/api/summary', authenticateToken, (req, res) => {
//     const sql = `
//         SELECT level, MAX(score) as best_score, total_questions
//         FROM results
//         WHERE user_id = ?
//         GROUP BY level
//         ORDER BY CASE level WHEN 'Easy' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Hard' THEN 3 END;
//     `;
//     db.all(sql, [req.user.id], (err, rows) => {
//         if (err) return res.status(500).json({ message: "Error fetching summary." });
//         res.json(rows);
//     });
// });

// app.get('/api/leaderboard', (req, res) => {
//     const sql = `
//         SELECT u.username, SUM(r.best_score) as total_score
//         FROM (
//             SELECT user_id, level, MAX(score) as best_score
//             FROM results
//             GROUP BY user_id, level
//         ) r
//         JOIN users u ON u.id = r.user_id
//         GROUP BY u.username
//         ORDER BY total_score DESC
//         LIMIT 10;
//     `;
//     db.all(sql, [], (err, rows) => {
//         if (err) return res.status(500).json({ message: "Error fetching leaderboard." });
//         res.json(rows);
//     });
// });

// // Nodemailer transporter setup (replace with your actual email service details)
// const transporter = nodemailer.createTransport({
//     service: 'gmail', // e.g., 'gmail'
//     auth: {
//         user: 'your-email@gmail.com', // Your email address
//         pass: 'your-app-password'    // Your email app password
//     }
// });

// app.post('/api/send-email', authenticateToken, (req, res) => {
//     const { feedback, result } = req.body;
//     const userId = req.user.id;

//     db.get('SELECT email FROM users WHERE id = ?', [userId], (err, user) => {
//         if (err || !user) {
//             return res.status(500).json({ message: 'Could not find user email.' });
//         }
        
//         const doc = new PDFDocument();
//         let buffers = [];
//         doc.on('data', buffers.push.bind(buffers));
//         doc.on('end', () => {
//             let pdfData = Buffer.concat(buffers);
//             const mailOptions = {
//                 from: 'your-email@gmail.com',
//                 to: user.email,
//                 subject: 'Your QuizMaster Results!',
//                 html: `<p>Hi ${req.user.username},</p>
//                        <p>Thanks for playing! Please find your latest quiz results attached.</p>
//                        <p><b>Your Feedback:</b> "${feedback}"</p>
//                        <p>We appreciate you taking the time to share your thoughts!</p>`,
//                 attachments: [{
//                     filename: `QuizMaster-${result.level}-Results.pdf`,
//                     content: pdfData,
//                     contentType: 'application/pdf'
//                 }]
//             };

//             transporter.sendMail(mailOptions, (error, info) => {
//                 if (error) {
//                     console.error("Email Error:", error);
//                     return res.status(500).json({ message: 'Failed to send email.' });
//                 }
//                 res.status(200).json({ message: 'Email sent successfully!' });
//             });
//         });

//         // Create PDF content
//         doc.fontSize(25).text(`QuizMaster Results: ${result.level} Level`, { align: 'center' });
//         doc.moveDown();
//         doc.fontSize(16).text(`Player: ${req.user.username}`);
//         doc.text(`Score: ${result.score} / ${result.total}`);
//         doc.moveDown();
//         doc.fontSize(14).text('Thank you for playing!', { align: 'center' });
//         doc.end();
//     });
// });

// // --- Start Server ---
// checkAndInitializeDatabase().then(database => {
//     db = database;
//     app.listen(PORT, () => {
//         console.log(`Server listening on port ${PORT}`);
//     });
// }).catch(err => {
//     console.error("Failed to initialize database and start server:", err);
//     process.exit(1);
// });



// --- Import dependencies ---
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { checkAndInitializeDatabase } = require('./database');

// --- App setup ---
const app = express();
const PORT = 3000;
const JWT_SECRET = 'your_super_secret_key'; // Replace with a secure key in production

app.use(cors());
app.use(express.json());

let db;

// --- JWT Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- AUTH ROUTES ---

// Register new user
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);
    db.run(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword],
        function(err) {
            if (err) {
                console.error(err);
                return res.status(500).send({ message: "Username or email already exists." });
            }
            res.status(201).send({ message: "User registered successfully!" });
        }
    );
});

// Login existing user
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) return res.status(500).send({ message: "Server error." });
        if (!user) return res.status(404).send({ message: "User not found." });

        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) return res.status(401).send({ message: "Invalid Password!" });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.status(200).send({ username: user.username, token });
    });
});

// --- QUIZ ROUTES ---

// Fetch questions by level
app.get('/api/questions/:level', authenticateToken, (req, res) => {
    const { level } = req.params;
    db.all(
        'SELECT id, question, optionA, optionB, optionC, optionD FROM questions WHERE level = ? ORDER BY RANDOM() LIMIT 5',
        [level],
        (err, rows) => {
            if (err) return res.status(500).send({ message: "Could not fetch questions." });
            res.json(rows);
        }
    );
});

// Submit quiz answers
app.post('/api/submit', authenticateToken, (req, res) => {
    const { level, userAnswers } = req.body;
    const userId = req.user.id;
    const questionIds = Object.keys(userAnswers);

    if (questionIds.length === 0) {
        return res.status(200).json({
            score: 0,
            total: 0,
            remarks: "No answers submitted.",
            correctAnswers: {}
        });
    }

    const placeholders = questionIds.map(() => '?').join(',');
    const sql = `SELECT id, correct_option FROM questions WHERE id IN (${placeholders})`;

    db.all(sql, questionIds, (err, correctAnswersRows) => {
        if (err) return res.status(500).json({ message: "Error fetching answers." });

        let score = 0;
        const correctAnswers = {};
        correctAnswersRows.forEach(row => {
            correctAnswers[row.id] = row.correct_option;
            if (userAnswers[row.id] === row.correct_option) {
                score++;
            }
        });

        const totalQuestions = correctAnswersRows.length;
        db.run(
            'INSERT INTO results (user_id, level, score, total_questions) VALUES (?, ?, ?, ?)',
            [userId, level, score, totalQuestions],
            function(err) {
                if (err) {
                    console.error("Error saving result:", err);
                    return res.status(500).json({ message: "Error saving result." });
                }
                const percentage = totalQuestions > 0 ? (score / totalQuestions) : 0;
                const remarks = percentage >= 0.8 ? "Excellent!" :
                                percentage >= 0.6 ? "Good Job!" : "Needs Improvement";
                res.json({ score, total: totalQuestions, remarks, correctAnswers });
            }
        );
    });
});

// --- RESULTS/SUMMARY ROUTES ---

// Get available result levels for user
app.get('/api/results', authenticateToken, (req, res) => {
    db.all('SELECT DISTINCT level FROM results WHERE user_id = ?', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ message: "Error fetching results." });
        res.json(rows);
    });
});

// Get summary of results
app.get('/api/summary', authenticateToken, (req, res) => {
    const sql = `
        SELECT level, MAX(score) as best_score, total_questions
        FROM results
        WHERE user_id = ?
        GROUP BY level
        ORDER BY CASE level WHEN 'Easy' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Hard' THEN 3 END;
    `;
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ message: "Error fetching summary." });
        res.json(rows);
    });
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
    const sql = `
        SELECT u.username, SUM(r.best_score) as total_score
        FROM (
            SELECT user_id, level, MAX(score) as best_score
            FROM results
            GROUP BY user_id, level
        ) r
        JOIN users u ON u.id = r.user_id
        GROUP BY u.username
        ORDER BY total_score DESC
        LIMIT 10;
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ message: "Error fetching leaderboard." });
        res.json(rows);
    });
});

// --- EMAIL CONFIGURATION ---

// Nodemailer transporter setup with Gmail App Password
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'mahikus98@gmail@.com',           // Replace with your Gmail address
        pass: 'toxxqkm'               // Replace with the 16-character App Password
    }
});

// Send email with PDF summary
app.post('/api/send-email', authenticateToken, (req, res) => {
    const { feedback, result } = req.body;
    const userId = req.user.id;

    db.get('SELECT email FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) {
            return res.status(500).json({ message: 'Could not find user email.' });
        }

        const doc = new PDFDocument();
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            let pdfData = Buffer.concat(buffers);
            const mailOptions = {
                from: 'mahikusu98g@gmail.com',    // Replace with your Gmail address
                to: user.email,
                subject: 'Your QuizMaster Results!',
                html: `<p>Hi ${req.user.username},</p>
                       <p>Thanks for playing! Please find your latest quiz results attached.</p>
                       <p><b>Your Feedback:</b> "${feedback}"</p>
                       <p>We appreciate you taking the time to share your thoughts!</p>`,
                attachments: [{
                    filename: `QuizMaster-${result.level}-Results.pdf`,
                    content: pdfData,
                    contentType: 'application/pdf'
                }]
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Email Error:", error);
                    return res.status(500).json({ message: 'Failed to send email.' });
                }
                res.status(200).json({ message: 'Email sent successfully!' });
            });
        });

        // Create PDF content
        doc.fontSize(25).text(`QuizMaster Results: ${result.level} Level`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text(`Player: ${req.user.username}`);
        doc.text(`Score: ${result.score} / ${result.total}`);
        doc.moveDown();
        doc.fontSize(14).text('Thank you for playing!', { align: 'center' });
        doc.end();
    });
});

// --- START SERVER ---

checkAndInitializeDatabase().then(database => {
    db = database;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(err => {
    console.error("Failed to initialize database and start server:", err);
    process.exit(1);
});

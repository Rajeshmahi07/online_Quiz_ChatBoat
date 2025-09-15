const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'quiz_app.db');
const SCHEMA_VERSION = 3; // Increment this number when schema changes

function checkAndInitializeDatabase() {
    return new Promise((resolve, reject) => {
        let db = new sqlite3.Database(DB_FILE, (err) => {
            if (err) {
                console.error("Could not connect to database", err);
                return reject(err);
            }
        });

        db.get("PRAGMA user_version;", (err, row) => {
            if (err || !row || row.user_version < SCHEMA_VERSION) {
                console.log('Old or non-existent database schema found. Re-initializing...');
                db.close(() => {
                    if (fs.existsSync(DB_FILE)) {
                        fs.unlinkSync(DB_FILE);
                    }
                    db = createAndSeedDatabase();
                    console.log('New database created successfully.');
                    resolve(db);
                });
            } else {
                console.log('Connected to the existing SQLite database.');
                resolve(db);
            }
        });
    });
}

function createAndSeedDatabase() {
    const db = new sqlite3.Database(DB_FILE, (err) => {
        if (err) {
            console.error("Could not create database", err);
            throw err;
        }
    });

    db.serialize(() => {
        db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`);
        
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password TEXT
        )`);

        // Questions Table
        db.run(`CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT,
            question TEXT,
            optionA TEXT,
            optionB TEXT,
            optionC TEXT,
            optionD TEXT,
            correct_option TEXT
        )`);

        // Results Table
        db.run(`CREATE TABLE IF NOT EXISTS results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            level TEXT,
            score INTEGER,
            total_questions INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);
        
        // Seeding Questions
        const questions = [
            // Easy
            { level: 'Easy', question: 'What is the capital of France?', options: ['Berlin', 'Madrid', 'Paris', 'Rome'], correct: 'Paris' },
            { level: 'Easy', question: 'Which planet is known as the Red Planet?', options: ['Earth', 'Mars', 'Jupiter', 'Venus'], correct: 'Mars' },
            { level: 'Easy', question: 'What is the largest mammal in the world?', options: ['Elephant', 'Giraffe', 'Blue Whale', 'Hippo'], correct: 'Blue Whale' },
            { level: 'Easy', question: 'How many continents are there?', options: ['5', '6', '7', '8'], correct: '7' },
            { level: 'Easy', question: 'What is the color of the sky on a clear day?', options: ['Green', 'Red', 'Yellow', 'Blue'], correct: 'Blue' },

            // Medium
            { level: 'Medium', question: 'Who wrote "To Kill a Mockingbird"?', options: ['Harper Lee', 'J.K. Rowling', 'Ernest Hemingway', 'Mark Twain'], correct: 'Harper Lee' },
            { level: 'Medium', question: 'What is the chemical symbol for Gold?', options: ['Ag', 'Au', 'G', 'Go'], correct: 'Au' },
            { level: 'Medium', question: 'How many states are in the United States?', options: ['48', '49', '50', '51'], correct: '50' },
            { level: 'Medium', question: 'Which ocean is the largest?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correct: 'Pacific' },
            { level: 'Medium', question: 'What is the hardest natural substance on Earth?', options: ['Gold', 'Iron', 'Diamond', 'Platinum'], correct: 'Diamond' },

            // Hard
            { level: 'Hard', question: 'Who was the first person to walk on the moon?', options: ['Buzz Aldrin', 'Yuri Gagarin', 'Neil Armstrong', 'Michael Collins'], correct: 'Neil Armstrong' },
            { level: 'Hard', question: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondrion', 'Chloroplast'], correct: 'Mitochondrion' },
            { level: 'Hard', question: 'In what year did the Titanic sink?', options: ['1905', '1912', '1918', '1923'], correct: '1912' },
            { level: 'Hard', question: 'What is the main ingredient in guacamole?', options: ['Tomato', 'Avocado', 'Onion', 'Lime'], correct: 'Avocado' },
            { level: 'Hard', question: 'Which country is known as the Land of the Rising Sun?', options: ['China', 'South Korea', 'Japan', 'Thailand'], correct: 'Japan' }
        ];

        const stmt = db.prepare("INSERT INTO questions (level, question, optionA, optionB, optionC, optionD, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?)");
        questions.forEach(q => {
            stmt.run(q.level, q.question, q.options[0], q.options[1], q.options[2], q.options[3], q.correct);
        });
        stmt.finalize();
    });

    return db;
}

module.exports = { checkAndInitializeDatabase };


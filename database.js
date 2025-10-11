const sqlite3 = require('sqlite3').verbose();

const DBSOURCE = 'db.sqlite';

let db = new sqlite3.Database(DBSOURCE, (err) => {
    if(err){
        console.log(err.message);
        throw err;
    }else{
        console.log('Connected to the SQLite database.')

        db.run(`CREATE TABLE users (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name text,
                last_name text,
                email text UNIQUE,
                password text,
                salt text,
                session_token text,
                CONSTRAINT email_unique UNIQUE (email)
            )`, (err) => {
                if(err){
                    console.log('Users table already created');
                }else{
                    console.log('Users table created');
                }
            }
        );

        
        db.run(`CREATE TABLE events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                description TEXT,
                location TEXT,
                start_date INTEGER,
                close_registration INTEGER,
                max_attendees INTEGER,
                creator_id INTEGER,
                FOREIGN KEY(creator_id) REFERENCES users(user_id)
            )`, (err) => {
                if(err){
                    console.log('Events table already created');
                }else{
                    console.log('Events table created');
                }
            }
        );

        db.run(`CREATE TABLE attendees (
                event_id INTEGER,
                user_id INTEGER,
                PRIMARY KEY (event_id, user_id),
                FOREIGN KEY (event_id) REFERENCES events(event_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )`, (err) => {
                if(err){
                    // console.log(err)
                    console.log('Attendees table already created');
                }else{
                    console.log('Attendees table created');
                }
            }
        );

        db.run(`CREATE TABLE questions (
                question_id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT,
                asked_by INTEGER,
                event_id INTEGER,
                votes INTEGER,
                FOREIGN KEY (asked_by) REFERENCES users(user_id),
                FOREIGN KEY (event_id) REFERENCES events(event_id)
            )`, (err) => {
                if(err){
                    console.log('Questions table already created');
                }else{
                    console.log('Questions table created');
                }
            }
        );

    //     db.run(`CREATE TABLE votes (
    //         question_id INTEGER,
    //         voter_id INTEGER,
    //         PRIMARY KEY (question_id, voter_id),
    //         FOREIGN KEY (question_id) REFERENCES questions(question_id),
    //         FOREIGN KEY (voter_id) REFERENCES users(user_id)
    //     )`, (err) => {
    //         if(err){
    //             console.log('Votes table already created');
    //         }else{
    //             console.log('Votes table created');
    //         }
    //     }
    // );
// 在 database.js 中找到 votes 表创建的部分，替换为以下代码：

db.run(`CREATE TABLE votes (
    question_id INTEGER,
    voter_id INTEGER,
    vote_type INTEGER NOT NULL DEFAULT 1,  // 添加这一行
    PRIMARY KEY (question_id, voter_id),
    FOREIGN KEY (question_id) REFERENCES questions(question_id),
    FOREIGN KEY (voter_id) REFERENCES users(user_id)
)`, (err) => {
    if(err){
        console.log('Votes table already created');
        // 表已存在，检查是否需要添加vote_type列
        db.all("PRAGMA table_info(votes)", (err, columns) => {
            if (err) {
                console.error('Error checking votes table structure:', err);
                return;
            }
            
            const hasVoteType = columns.some(col => col.name === 'vote_type');
            if (!hasVoteType) {
                console.log('Adding vote_type column to existing votes table...');
                db.run('ALTER TABLE votes ADD COLUMN vote_type INTEGER NOT NULL DEFAULT 1', (err) => {
                    if (err) {
                        console.error('Error adding vote_type column:', err);
                    } else {
                        console.log('vote_type column added successfully');
                    }
                });
            } else {
                console.log('vote_type column already exists in votes table');
            }
        });
    }else{
        console.log('Votes table created with vote_type column');
    }
});

    }
});

module.exports = db;
const express = require('express');
const bodyParser = require('body-parser');
const flash = require('express-flash');
const session = require('express-session');
const bcrypt = require('bcrypt');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('to-do-list.db');

const app = express();
const port = 8080;

const date = require(__dirname + '/date.js');

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(flash());
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true
}));

const workItems = [];

app.get('/', (req, res) => {
  let day = date.getDate();

  db.all('SELECT * FROM todos', (err, rows) => {
    if (err) return console.log(err);
    res.render('list', {listTitle: day, newItems: rows})
  })
});

app.post('/', (req, res) => {
  const newItem = req.body.newItem;
  const todoTime = req.body.todoTime;
  const day = date.getDate();

  db.run("INSERT INTO todos (todoItem, time, todoTime) VALUES (?,?,?)", newItem, day, todoTime, (err) => {
    if (err) return console.log(err);
    res.redirect('/')
  });
});

app.get('/edit/:id', (req, res) => {
  const id = req.params.id;
  const day = date.getDate();

  db.all('SELECT * FROM todos WHERE id=?', id,(err, rows) => {
    if (err) return console.log(err);
    res.render('edit', { listTitle: day, todoItem: rows[0] });
  })
});

app.post('/edit', (req, res) => {
  const todoItem = req.body.todoItem;
  const todoTime = req.body.todoTime;
  const id = req.body.id;

  db.run('UPDATE todos SET todoItem=?, todoTime=? WHERE id=?',todoItem, todoTime, id, (err) => {
    if (err) return console.log(err);
    res.redirect('/')
  });
});

app.post('/delete/:id', (req, res) => {
  const id = req.params.id;
  const todoItem = req.body.todoItem
  const todoTime = req.body.todoTime

  db.run('INSERT INTO history (todoItem, finish_time, id) VALUES (?,?,?)', todoItem, todoTime, id, (err) => {
    if (err) {
      console.log(err);
    }
  });

  db.run('DELETE FROM todos WHERE id=?', id, (err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect('/');
    }
  });
});

app.get('/history', (req, res) => {
  db.all('SELECT * FROM history', (err, rows) => {
    if (err) return console.log(err);
    res.render('list', {listTitle: 'History', newItems: rows})
  })
});

app.get('/register', (req, res) => {
  res.render('register', {listTitle: 'Register', message: req.flash('message')})
});

app.post('/register', async (req, res) => {
  const { username, email, password, confirm_password} = req.body;

  // Check if username or email already exists in database
  const existingUser = await new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username=? OR email=?', [username, email], (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
  
  // If user already exists, display flash message and redirect to register page
  if (existingUser) {
    req.flash('error', 'Username or email already exists');
    res.redirect('register');
    return;
  }
  
  // Hash password using bcrypt
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Insert new user into database
  db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword], (err) => {
    if (err) {
      req.flash('error', 'Error creating user');
      res.redirect('register');
    } else {
      req.flash('success', 'Registration successful');
      res.redirect('/');
    }
  });
});
app.listen(port, () => {
  console.log('Server is runnning - http://localhost:8080/');
});

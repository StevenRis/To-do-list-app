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
const login_required = require(__dirname + '/session.js')

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(flash());

// Session
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
}));

app.get('/', async (req, res) => {
  let day = date.getDate();

  try {
    const existingTodos = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM todos', (err, rows) => {
        if (err) reject (err);
        resolve(rows);
      });
    });

    if (login_required) {
      res.render('list', {listTitle: day, newItems: existingTodos, user: req.session.user});
    } else {
      res.redirect('/');
    };

  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('/');
  }
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

app.get('/edit/:id', async (req, res) => {
  const id = req.params.id;
  const day = date.getDate();

  try {
    const todoItem = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM todos WHERE id=?', id,(err, row) => {
        if (err) reject (err);
        resolve(row);
      });
    })
    res.render('edit', { listTitle: day, todoItem: todoItem[0] });
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('/');
  }
});

app.post('/edit', async (req, res) => {
  const { id, todoItem, todoTime } = req.body;

  try {
    await new Promise((resolve, reject) => {
      db.run('UPDATE todos SET todoItem=?, todoTime=? WHERE id=?', [todoItem, todoTime, id], (err) => {
        if (err) reject (err);
        resolve;
      });
      req.flash('success', 'Item was updated')
      res.redirect('/')
    })
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('/');
  }
});

app.post('/delete/:id', async (req, res) => {
  const id = req.params.id;
  const { todoItem, todoTime } = req.body;

  try {
    // await new Promise((resolve, reject) => {
    //   db.run('INSERT INTO history (todoItem, finish_time, id) VALUES (?,?,?)', [todoItem, todoTime, id], (err) => {
    //     if (err) reject (err);
    //     resolve;
    //     });
    //   });

    await new Promise((resolve, reject) => { 
      db.run('DELETE FROM todos WHERE id=?', [id], (err) => {
        if (err) reject (err);
        resolve;
      });
      req.flash('success', 'Item was deleted')
      res.redirect('/')
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('/');
  }

});

app.get('/history', (req, res) => {
  db.all('SELECT * FROM history', (err, rows) => {
    if (err) return console.log(err);
    if (login_required) {
      res.render('list', {listTitle: 'History', newItems: rows, user: req.session.user})
    } else {
      res.redirect('/');
    }
  })
  
});

app.get('/register', (req, res) => {
  res.render('register', {listTitle: 'Register', message: req.flash('message')})
});

app.post('/register', async (req, res) => {
  const { username, email, password, confirm_password} = req.body;

  // Check if username or email already exists in database
  try {
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
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('register');
  }
});

app.get('/login', (req,res) => {
  res.render('login', {listTitle: 'Log in', messages: req.flash()})
})

// Log in
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if(err) reject(err);
        resolve(row);
      });
    })

    if(!user) {
      req.flash('error', 'Invalid username or password');
      return res.redirect('login');
    }

    const result = await bcrypt.compare(password, user.password);
    if(!result) {
      req.flash('error', 'Invalid username or password.')
      return res.redirect('login');
    }
    req.session.user = user;
    req.flash('success', 'Log in successful!')
    res.redirect('/');

    console.log(req.session.user);

  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('login');
  }
});

// Log out
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
})

app.listen(port, () => {
  console.log('Server is runnning - http://localhost:8080/');
});

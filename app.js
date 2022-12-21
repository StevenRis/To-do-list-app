const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 8080;

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Array of items, that are displayed to the user
// when the user firstly opens the home page
const items = ['Buy food', 'Cook food', 'Eat food'];

app.get('/', (req, res) => {
  const today = new Date();

  const options = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };

  const day = today.toLocaleDateString('en-US', options);

  // When user clicks on Add button
  // array of items with new item is displayed
  res.render('list', { kindOfDay: day, newItems: items });
});

app.post('/', (req, res) => {
  // Get text from user input
  newItem = req.body.newItem;

  if (newItem) {
    // Add text to items array
    items.push(newItem);
    res.redirect('/');
  }
});

app.listen(port, () => {
  console.log('Server is runnning - port 8080');
});

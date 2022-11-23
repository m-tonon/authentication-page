const path = require('path');

const express = require('express');
const session = require('express-session'); // => package that deals with sessions
const mongodbStore = require('connect-mongodb-session'); 
// deals with the store setting on express-session

const db = require('./data/database');
const demoRoutes = require('./routes/demo');

const MongoDBStore = mongodbStore(session); // => conecting the two packages

const app = express();

const sessionStore = new MongoDBStore({ // => the setting needed to connect to the db
  uri: 'mongodb://127.0.0.1:27017', // path for the database
  databaseName: 'auth-demo', // the same name used on database.js
  collection: 'sessions'
})

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.use(session({ // settings of the session
  secret: 'super-secret', // key to secure the session
  resave: false, // a session is only updated in db if the data is really changed
  saveUninitialized: false, // a session is stored once there is a data
  store: sessionStore,//controls where the session data should be stored
  // cookie: {
  //   maxAge: 30 * 24 * 60 * 60 * 1000 // how long the cookie will last in miliseconds
  // }
}));

app.use(demoRoutes);

app.use(function(error, req, res, next) {
  res.render('500');
})

db.connectToDatabase().then(function () {
  app.listen(3000);
});

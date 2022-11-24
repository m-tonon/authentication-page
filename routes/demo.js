const express = require('express');
const bcrypt = require('bcryptjs'); // require bcryptjs - a hashing password package

const db = require('../data/database');

const router = express.Router();

router.get('/', function (req, res) {
  res.render('welcome');
});

router.get('/signup', function (req, res) {
  let sessionInputData = req.session.inputData; // same key from router.post for signup

  if (!sessionInputData) { 
    sessionInputData = {
      hasError: false,
      email: '',
      confirmEmail: '',
      password: ''
    };
  }

  req.session.inputData = null; // this technique is called 'flashing'
  // this clean the forms to the next request after redirect

// This code above sent this inputdata to the template and then if get any wrong data apply the user
// just need to correct and no rewrite everything again => now can use on the template signup.ejs

  res.render('signup', { inputData: sessionInputData });
});

router.get('/login', function (req, res) {
  let sessionInputData = req.session.inputData;

  if (!sessionInputData) { 
    sessionInputData = {
      hasError: false,
      email: '',
      password: ''
    };
  }

  res.render('login', { inputData: sessionInputData });
});

router.post('/signup', async function (req, res) {
  const userData = req.body;
  const enteredEmail = userData.email;
  const enteredConfirmEmail = userData['confirm-email'];
  const enteredPassword = userData.password;

  if ( // validating rules
    !enteredEmail ||
    !enteredConfirmEmail ||
    !enteredPassword ||
    enteredPassword.trim() < 6 ||
    enteredEmail !== enteredConfirmEmail ||
    !enteredEmail.includes('@')
  ) {
    req.session.inputData = {// stores those fields in a session so no need rewrite when get error
      hasError: true,
      message: 'Invalid input - please check your data.',
      email: enteredEmail,
      confirmEmail: enteredConfirmEmail,
      password: enteredPassword,
    };

    req.session.save(function () { // redirect after the session above is saved
      return res.redirect('/signup'); // return to the signup page
    });
    return; // stops the code - this ensure that the next codes doesnt execute
  }

  const existingUser = await db
    .getDb()
    .collection('users')
    .findOne({ email: enteredEmail });

  if (existingUser) {
    req.session.inputData = {
      hasError: true,
      message: 'User exists already!',
      email: enteredEmail,
      confirmEmail: enteredConfirmEmail,
      password: enteredPassword,
    };
    req.session.save(function(){
      return res.redirect('/signup');
    });

    return;
  }

  const hashedPassword = await bcrypt.hash(enteredPassword, 12);
  // first parameter is which should be crypted and
  // the second is the level of strength of the crypt

  const user = {
    email: enteredEmail,
    password: hashedPassword,
  };

  await db.getDb().collection('users').insertOne(user);

  res.redirect('/login');
});

router.post('/login', async function (req, res) {
  const userData = req.body;
  const enteredEmail = userData.email;
  const enteredPassword = userData.password;

  const existingUser = await db
    .getDb()
    .collection('users')
    .findOne({ email: enteredEmail });

  if (!existingUser) {
    req.session.inputData = {
      hasError: true,
      message: 'Could not log you in - please check your credentials!.',
      email: enteredEmail,
      password: enteredPassword,
    };
    req.session.save(function(){
      return res.redirect('/login');
    });
    return;
  }

  const passwordsAreEqual = await bcrypt.compare(
    enteredPassword,
    existingUser.password
  );

  if (!passwordsAreEqual) {
    req.session.inputData = {
      hasError: true,
      message: 'Could not log you in - please check your credentials!.',
      email: enteredEmail,
      password: enteredPassword,
    };
    req.session.save(function(){
      return res.redirect('/login');
    });
    return;
  }

  req.session.user = { id: existingUser._id, email: existingUser.email }; // save in user object
  req.session.isAuthenticated = true;
  req.session.save(function () {// force the data to be save on db
    res.redirect('/profile');   // and just then the user will be redirected
  });
});

router.get('/admin', async function (req, res) {
  if (!res.locals.isAuth) { // if is falsy - no data on session
    return res.status(401).render('401');
  }

  if(!res.locals.isAdmin) { // checking if the user has admin authorization
    return res.status(403).render('403');
  }

  res.render('admin');
});

router.get('/profile', function (req, res) {
  if (!res.locals.isAuth) { 
    return res.status(401).render('401');
  }
  res.render('profile');
});

router.post('/logout', function (req, res) { // 'deleting' the session
  req.session.user = null;
  req.session.isAuthenticated = false;
  res.redirect('/');
});

module.exports = router;

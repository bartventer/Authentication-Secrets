// REQUIRE PACKAGES
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');


// CONFIGURE EXPRESS APP
const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

// CONFIGURE MONGODB CONNECTION WITH MONGOOSE
mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});

// MONGOOSE SCHEMA AND MODEL CREATION
// USER SCHEMA
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

const secret = process.env.SECRET;
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });

// USER COLLECTION/MODEL
const User = mongoose.model('User', userSchema);


// HOME ROUTE
app.get("/", function(req, res){
  res.render("home");
});


// LOGIN ROUTE
app.get("/login", function(req, res){
  res.render("login");
});

app.post("/login", function(req, res){
  const email = req.body.username;
  const password = req.body.password;

  User.findOne({email: email}, function(err, foundUser){
  if (err){
    console.log(err);
  }  else{
    if (foundUser){
      if (foundUser.password === password){
        res.render("secrets");
      }
    }
  }
  });
});


// REGISTER ROUTE
app.get("/register", function(req, res){
  res.render("register");
});

app.post("/register", function(req, res){
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });
  newUser.save(function(err){
    if(err){
      console.log(err);
    }else{
      res.render("secrets");
    }
  });
});


// LAUNCH EXPRESS SERVER
app.listen(3000, function () {
    console.log("Server started on port 3000.")
});

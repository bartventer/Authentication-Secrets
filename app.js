/////////////////////////////////////////////////////////////
// REQUIRE PACKAGES
/////////////////////////////////////////////////////////////
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

/////////////////////////////////////////////////////////////
// CONFIGURE EXPRESS APP AND MIDDLEWARE
/////////////////////////////////////////////////////////////
const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({ mongooseConnection: mongoose.connection })
}));
app.use(passport.initialize());
app.use(passport.session());

/////////////////////////////////////////////////////////////
// CONFIGURE MONGODB CONNECTION WITH MONGOOSE
/////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////
// LOCAL DEVELOPMENT: CONNECTION TO MONGODB DATABASE
/////////////////////////////////////////////////////////////
// mongoose.connect('mongodb://localhost:27017/userDB',
// {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true}
// );

/////////////////////////////////////////////////////////////
// PRODUCTION: CONNECTION TO MONGO ATLAS CLUSTER
/////////////////////////////////////////////////////////////
mongoose.connect('mongodb+srv://'+process.env.ATLAS_ADMIN_USERNAME +':'+ process.env.ATLAS_ADMIN_PASSWORD+'@cluster0.ljolo.mongodb.net/userDB',
{useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true}
);

/////////////////////////////////////////////////////////////
// MONGOOSE SCHEMA AND MODEL CREATION
/////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////
// SECRET SCHEMA
/////////////////////////////////////////////////////////////
const secretSchema = new mongoose.Schema({
  secret: String,
  timestamp : {type: Number, default: Date.now}
});


/////////////////////////////////////////////////////////////
// SECRET COLLECTION/MODEL
/////////////////////////////////////////////////////////////
const Secret = mongoose.model('Secret', secretSchema);


/////////////////////////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////////////////////////
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secrets: [secretSchema]
});


/////////////////////////////////////////////////////////////
// PLUGIN PASSPORT-LOCAL-MONGOOSE INTO THE SCHEMA
/////////////////////////////////////////////////////////////
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


/////////////////////////////////////////////////////////////
// USER COLLECTION/MODEL
/////////////////////////////////////////////////////////////
const User = mongoose.model('User', userSchema);


/////////////////////////////////////////////////////////////
// SIMPLIFIED PASSPORT/PASSPORT-LOCAL CONFIGURATION / GOOGLE SESSIONS
/////////////////////////////////////////////////////////////
passport.use(User.createStrategy()); //createStrategy is responsible to setup passport-local LocalStrategy with the correct options.
//creates cookie with unique user id
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
//deletes cookie with the unique user id
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


/////////////////////////////////////////////////////////////
// GOOGLE AUTHENTICATION CONFIGURE STRATEGY
/////////////////////////////////////////////////////////////
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    userProfileURL: process.env.USER_PROFILE_URL
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


/////////////////////////////////////////////////////////////
// HOME ROUTE
/////////////////////////////////////////////////////////////
app.get("/", function(req, res){
  res.render("home");
});


/////////////////////////////////////////////////////////////
// GOOGLE ROUTE TO AUTHENTICATE REQUESTS
/////////////////////////////////////////////////////////////
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);


/////////////////////////////////////////////////////////////
// GOOGLE ROUTE TO HANDLE/REDIRECT SUCCESSFUL AUTHENTICATIONS
/////////////////////////////////////////////////////////////
app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });


/////////////////////////////////////////////////////////////
// LOGIN ROUTE GET REQUESTS
/////////////////////////////////////////////////////////////
app.get("/login", function(req, res){
  res.render("login");
});


/////////////////////////////////////////////////////////////
// LOGIN ROUTE POST REQUESTS
/////////////////////////////////////////////////////////////
app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});


/////////////////////////////////////////////////////////////
// REGISTER ROUTE GET REQUEST
/////////////////////////////////////////////////////////////
app.get("/register", function(req, res){
  res.render("register");
});


/////////////////////////////////////////////////////////////
// REGISTER ROUTE POST REQUEST
/////////////////////////////////////////////////////////////
app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err){
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});


/////////////////////////////////////////////////////////////
// SECRETS ROUTE GET REQUEST
/////////////////////////////////////////////////////////////
app.get("/secrets", function(req, res){
  Secret.find(function(err, secretsFound){
    if (err){
      console.log(err);
    } else {
      secretsFound.sort(function(a,b){
        return a.timestamp-b.timestamp
      });
      res.render("secrets", {secretsListOrdered: secretsFound, isAuthenticated: req.isAuthenticated()});
    }
  });

});


/////////////////////////////////////////////////////////////
// SUBMIT ROUTE TO ADD NEW SECRET
/////////////////////////////////////////////////////////////
app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});


/////////////////////////////////////////////////////////////
// SUBMIT ROUTE POST REQUESTS
/////////////////////////////////////////////////////////////
app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  const newSecret = new Secret({
    secret: submittedSecret
  });
  newSecret.save(function(err){
    if(err){
      console.log(err);
    } else {

      console.log(req.user.id);
      User.updateOne({_id:req.user.id}, {$push: {secrets: newSecret}}, function(err){
        if (err){
          console.log(err);
        }
      });
      res.redirect("/secrets");
    }
  });

});


/////////////////////////////////////////////////////////////
// LOGOUT ROUTE
/////////////////////////////////////////////////////////////
app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});


/////////////////////////////////////////////////////////////
// LAUNCH EXPRESS SERVER
/////////////////////////////////////////////////////////////
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function() {
  console.log("Server started succesfully");
});

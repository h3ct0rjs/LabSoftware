const express = require("express");
const path = require("path");
const favicon = require("serve-favicon");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const expresssValidator = require("express-validator");
const bcrypt = require("bcrypt");

//Authentication
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
var MySQLStore = require("express-mysql-session")(session);

var index = require("./routes/index");
var users = require("./routes/users");

const app = express();
require("dotenv").config();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expresssValidator());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

const options = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

const sessionStore = new MySQLStore(options);

app.use(
  session({
    secret: process.env.SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false
    //cookie: { secure: true }
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/", index);
app.use("/users", users);

passport.use(
  new LocalStrategy(function(emailaddr, password, done) {
    console.log("Trigger LocalStrategy");
    console.log(emailaddr);
    console.log(password);
    const db = require("./db");
    db.query(
      "SELECT * from user where email_address = ?",
      [emailaddr],
      function(err, results, fields) {
        //there was a problem with the query
        if (err) {
          console.log(
            "There was a problem when trying to login, wrong mysql query"
          );
          done(err);
        }

        //The email address doesn't exist
        if (results.length === 0) {
          done(null, false);
        }

        //console.log(results);
        const hash = results[0].password.toString();
        const user_id = results[0].id_user;
        //check if the user provided is the same, we're asuming that the email address is in the database
        console.log(results);
        console.log(`User id is ${user_id}`);
        console.log(hash);
        bcrypt.compare(password, hash, function(err, response) {
          if (response === true) {
            console.log("Okay");
            return done(null, true);
          } else {
            return done(null, false);
          }
        });
      }
    );
  })
);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

// Handlebars default config
const hbs = require("hbs");
const fs = require("fs");

const partialsDir = __dirname + "/views/partials";

const filenames = fs.readdirSync(partialsDir);

filenames.forEach(function(filename) {
  const matches = /^([^.]+).hbs$/.exec(filename);
  if (!matches) {
    return;
  }
  const name = matches[1];
  const template = fs.readFileSync(partialsDir + "/" + filename, "utf8");
  hbs.registerPartial(name, template);
});

hbs.registerHelper("json", function(context) {
  return JSON.stringify(context, null, 2);
});

module.exports = app;

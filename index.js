if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// importing dependencies we added in package.json :
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const methodOverride = require('method-override')
const compression = require('compression')
const mongoose = require("mongoose");
const { fileLoader } = require("ejs");
const { auth } = require('express-openid-connect');
var bodyParser = require('body-parser');

// import routes/controllers
const indexRouter = require("./routes/index");
const authorRouter = require("./routes/authors.min");
const bookRouter = require("./routes/books");

const app = express();

// setup view engine and view dir
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.set("layout", "layouts/layout");

app.use(expressLayouts);
app.use(methodOverride('_method'))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));

// auth0 configuration
const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: process.env.ISSUER_BASE_URL
};

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

// gzip compression
app.use(compression(
    {
      level: 6,
      // bytes;
      threshold: 10*1000,
      filter: (req,res) => {
        if (req.headers['x-no-compression']){
          return false
        }
        return compression.filter(req,res)
      },
}))

// download pop-up test
app.get("/test", async(req, res) => {
    // res.download("server.js"); //download pop-up
    res.status(200).json({
      success: true,
      message: `App's running!`
    });
    // console.log("here");
});

// database connection
function connectDB()
{
    mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true});
    const connection = mongoose.connection;
    connection.once('open', () => {
      console.log('------------------------------')
      console.log('Database connected!');
    }).on('error', err => {
      console.log('Connection failed!');
    });
}
connectDB()

// make  req.oidc.isAuthenticated() available in all templates (ejs files) :
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.oidc.isAuthenticated();
  res.locals.user = req.oidc.user;
  next();
});

// using routes/controllers handlers as middle-wares to handle requests :
app.use("/", indexRouter);
app.use("/authors", authorRouter);
app.use("/books", bookRouter);

// middleware : will put public before path of all css/js files in layout.ejs ;
app.use(express.static(__dirname + "/public/"));

const PORT = process.env.PORT || "5000";

app.listen(PORT, () => {
  console.log(`\nServer is running at http://localhost:${PORT} \nenvironment: ${process.env.NODE_ENV}`);
});
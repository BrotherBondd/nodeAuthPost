import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import connectMongoDB from './db.js';
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import flash from 'connect-flash';
import path from 'path';




const app = express();
const PORT = process.env.PORT || 3000;


//* connect to mongoDB  database
connectMongoDB();
// __________________________________________________________________
//! MIDDLEWARES
// it will pass all the req into json format
app.use(express.json());
//* it is a Middleware for parsing URL-encoded data from form submissions. 
app.use(express.urlencoded({ extended: false }));

//*make uploads directory as static
//This part makes the uploads directory accessible as a static folder. It means that any files inside the uploads directory can be accessed directly via the URL path /uploads. 
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

//*cookie middleware
app.use(cookieParser(process.env.COOKIE_SECRET));

//*session middleware
// To store authenticated users data
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something is stored
    cookie: {
        maxAge: 60000 * 60 * 24 * 7 //we'll store all the cookies into the browser for 1 week after that cookie will expires
    }
}));

//* for Initialize flash messages middleware
app.use(flash());
//* to store flash messages for views in any local variable
//* Middleware to make flash messages available in template 
app.use(function (req, res, next) {
    res.locals.message = req.flash();
    next();
})

//* store authenticated user's session data foe views
app.use(function (req, res, next) {
    // if the user variable or user data is available in the session then we'll assign it in the locals object user variable and if there no session data then we can simply assign null.
    res.locals.user = req.session.user || null;
    next();
})
// ________________________________________________________________________


// set template engine to ejs
app.set('view engine', 'ejs');


//*ROUTES________________________________________________________________ 
// auth route
app.use('/', authRoutes);

// post route
app.use('/', postRoutes);





//*____________________________________________________________________ 

app.listen(PORT, () => {
    console.log(`server is running on port http:localhost:${PORT} `);
});
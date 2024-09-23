import express from 'express';
import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import { guestRoute, protectedRoute } from '../middlewares/authMiddleware.js';
import nodemailer from 'nodemailer';

const router = express.Router();

//? nodemailer credentials --> For mail testing 
var transport = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: "76d4c9aa2a2e2b",
        pass: "a513f56f99fe06"
    }
});

//* route for login page
router.get('/login', guestRoute, (req, res) => {
    res.render('login', { title: 'Login Page', active: 'login' });
});

//* route for register page
router.get('/register', guestRoute, (req, res) => {
    res.render('register', { title: 'Register Page', active: 'register' });
});

//* route for forgot password page
router.get('/forgot-password', guestRoute, (req, res) => {
    res.render('forgot-password', { title: 'Forgot Password Page', active: 'forgot' });
});

//* route for Reset password page
router.get('/reset-password/:token', guestRoute, async (req, res) => {

    const { token } = req.params;
    // now we'll try to find the user with this token from the DB
    const user = await User.findOne({ token });

    // if user is not available in the DB with this token
    if (!user) {
        req.flash('error', 'Link expired or invalid');
        return res.redirect('/forgot-password');
    }

    res.render('reset-password', { title: 'Reset Password Page', active: 'reset', token });
});
//* route for profile page
router.get('/profile', protectedRoute, (req, res) => {
    res.render('profile', { title: 'Profile Page', active: 'profile', active: 'profile' });
});







//!________________________________________________________________________________________________
// ! Handle user Registration Form
router.post('/register', guestRoute, async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const userExists = await User.findOne({ email });
        // if user exists
        if (userExists) {
            req.flash('error', 'User already exists with this email!');
            return res.redirect('/register');
        }

        // if user not exists then we'll register a new user
        // and we don't want to store plain pswd so for that
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name,
            email,
            password: hashedPassword
        });
        // in the last too save in the DB
        user.save();
        req.flash('success', 'User registered successfully, you can login now!');
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Something went wrong, please try again');
        res.redirect('/register');
    }
});

// ! Handle user Login req/Form
router.post('/login', guestRoute, async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1st we'll find the user with the email(bcoz it;s unique)
        const user = await User.findOne({ email });

        // if user exists
        if (user && (await bcrypt.compare(password, user.password))) {
            // if both the conditions are true ten we'll store the user data in the session
            req.session.user = user; //then
            console.log(req.session.user);
            res.redirect('/profile');
        } else {
            // now if the user is found but the pswd is not matched
            req.flash('error', 'Invalid email or password!');
            res.redirect('/login');
        }
    } catch (error) {
        console.error(error);
        req.flash('error', 'Something went wrong, please try again');
        res.redirect('/login');
    }
});

// ! Handle user logout
router.post('/logout', (req, res) => {
    // 1st remove all the session data for that we use destroy method
    req.session.destroy();
    res.redirect('/login');
});

// ! Handle forgot password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        // 1st we'll check if the user with this email is present in DB or not
        const user = await User.findOne({ email });

        // and if user is not present
        if (!user) {
            req.flash('error', 'User not found with this email');
            return res.redirect('/forgot-password');
        }

        // now 1st we create a random token which we'll send with the reset pswd link and we'll also store that token for this user in the DB
        const token = Math.random().toString(36).slice(2);

        // sending token to DB
        user.token = token;
        await user.save();

        // now we'll send the email to this email_ID for that use node_Mailer
        // now to send email we use maul trap for testing
        const info = await transport.sendMail({
            from: '"PostNest" <1shivam2singh@gmail.com>', // sender address
            to: email, // list of receivers/ user email
            subject: "Password Reset", // Subject line
            text: "Reset Your Password", // plain text body
            html: `<p>Click this link to reset your password: <a href='http://localhost:3000/reset-password/${token}'>Reset Password</a> <br> Tank You!</p>`, // html body/ link for reseting the password
        });

        //  next we'll check a condition, when email is sent successfully then this info constant will return a msg_ID
        if (info.messageId) {
            req.flash('success', 'Password reset link has been sent to your email!');
            res.redirect('/forgot-password');
        } else {
            req.flash('error', 'error sending email!');
            res.redirect('/forgot-password');
        }



    } catch (error) {
        console.error(error);
        req.flash('error', 'Something went wrong, please try again');
        res.redirect('/forgot-password');
    }
});


// ! Handle reset password
router.post('/reset-password', async (req, res) => {
    const { token, new_password, confirm_new_password } = req.body;

    try {

        console.log('New Password:', new_password);
        console.log('Confirm Password:', confirm_new_password);

        const user = await User.findOne({ token });

        if (new_password !== confirm_new_password) {
            req.flash('error', 'Password do not match!');
            return res.redirect(`/reset-password/${token}`);
        }

        if (!user) {
            req.flash('error', 'Invalid token!');
            return res.redirect('/forgot-password');
        }

        // if all the conditions are met
        // 1st reset the password
        user.password = await bcrypt.hash(new_password, 10);
        // and in the last finally make the token null
        user.token = null;
        await user.save();

        req.flash('success', 'Password reset successfully');
        res.redirect('/login');


    } catch (error) {
        console.error(error);
        req.flash('error', 'Something went wrong, please try again');
        res.redirect('/reset-password');
    }
});






export default router;
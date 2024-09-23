//* Protect routes middleware function
export const protectedRoute = (req, res, next) => {
    if(!req.session.user){
        return res.redirect('/login');
    }
    next();
};

//* guest routes middleware function
export const guestRoute = (req, res, next) => {
    if(req.session.user){
        return res.redirect('/profile');
    }
    // if there is no authenticated user in the session
    next();
};

//* now we have to use this middleware in authRoutes file where login, registration, forgot-password and reset-password are guest routes so in all of these we need to use this guest route and this profile is a protected route so in that we use protected routes
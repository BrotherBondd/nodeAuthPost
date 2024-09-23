import express from 'express';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import User from '../models/userModel.js';
import Post from '../models/postModel.js';
import { unlink } from 'fs';

const router = express.Router();


//! Setup storage engine using multer.
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
//! define middleware for single file upload
//! Initialize upload variable with the storage engine
const upload = multer({ storage: storage });
// now we can use this middleware in our route


//* route for home page 
router.get('/', async (req, res) => {

    const page = parseInt(req.query.page) || 1;
    // this is for how many post we want to display on home page
    const limit = 2;

    // this will calculate the starting index from where we'll fetch the post from the DB from this index
    const startIndex = (page - 1) * limit;
    // upto this index
    const endIndex = page * limit;

    // next get the total count of the post from the DB
    const totalPosts = await Post.countDocuments().exec();

    const posts = await Post.find()
          .populate({path: 'user', select: '-password'})
          .sort({_id: -1})
          .limit(limit)
          .skip(startIndex)
          .exec()
    
    const pagination = {
        currentPage: page,
        totalPage: Math.ceil(totalPosts / limit),
        hasNextPage: endIndex < totalPosts,
        hasPrevPage: startIndex > 0,
        nextPage: page + 1,
        prevPage: page - 1,
    };

    // res.send('hello from express ');
    //? now insted of sending above plain text message we'll now render this EJS view
    res.render('index', { title: 'Home', active: 'home', posts, pagination });
})

//* route for my posts page
router.get('/my-posts', protectedRoute, async (req, res) => {
    //11V. here we fetch all the posts from the current logged in user from the DB and and pass to this view
    try {
        // 1st get the current logged in userID from the session
        const userId = req.session.user._id;
        // here we're fetching the user along with posts
        const user = await User.findById(userId).populate('posts');

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/');
        }

        res.render('posts/my-posts', {
            title: 'My Posts',
            active: 'my_posts',
            posts: user.posts,
        });


    } catch (error) {
        console.log(error);
        req.flash('error', 'An error occurred while fetching your posts!');
        res.redirect('/my-posts');
    }


});

//* route for create new post page 
router.get('/create-post', protectedRoute, (req, res) => {
    res.render('posts/create-posts', { title: 'Create Posts', active: 'create_post' });
});

//* route for edit post page
router.get('/edit-post/:id', protectedRoute, async (req, res) => {
    try {
        // 1st we get the post id
        const postId = req.params.id;
        const post = await Post.findById(postId);

        if (!post) {
            req.flash('error', 'Could not find post!');
            return res.redirect('my-posts');
        }

        res.render('posts/edit-post', {
            title: 'Edit Post',
            active: 'edit_post',
            post,
        });

    } catch (error) {
        console.error(error);
        req.flash('error', 'something went wrong');
        res.redirect('/my-posts');
    }

});

//* handle update a post request
//! handle update a post request
router.post('/update-post/:id', protectedRoute, upload.single('image'), async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);

        if (!post) {
            req.flash('error', 'No post found');
            return res.redirect('/my-posts');
        }

        post.title = req.body.title;
        post.content = req.body.content;
        post.slug = req.body.title.replace(/\s+/g, '-').toLowerCase();

        // if req has any file means if there is any new file then in that case 1st we'll delete the previous file from the uploads directory and then upload the new file and if there is no file selected then we use the previous file as it is..
        if (req.file) {
            unlink(path.join(process.cwd(), 'uploads') + '/' + post.image, (err) => {
                if (err) {
                    console.error(err);
                }
            });
            post.image = req.file.filename;
        }

        await post.save();
        req.flash('success', 'Post Updated Successfully');
        res.redirect('/my-posts');

    } catch (error) {
        console.error(error);
        req.flash('error', 'something went wrong');
        res.redirect('/my-posts');
    }
})

//* route for view post in detail
router.get('/post/:slug', async (req, res) => {

    try {
        const slug = req.params.slug;
        const post = await Post.findOne({ slug }).populate('user');

        if (!post) {
            req.flash('error', 'Post not found');
            return res.redirect('/my-posts');
        }

        res.render('posts/view-post', {
            title: 'View Post',
            active: 'view_post',
            post
        });

    } catch (error) {
        console.error(error);
        req.flash('error', 'something went wrong');
        res.redirect('/my-posts');
    }

});


//! Handle create new post request
router.post('/create-post', protectedRoute, upload.single('image'), async (req, res) => {

    try {
        const { title, content } = req.body;
        const image = req.file ? req.file.filename : null;
        const slug = title.replace(/\s+/g, '-').toLowerCase();

        // console.log('File Data:', req.file);
        // console.log('Body Data:', req.body);
        if (!image) {
            req.flash('error', 'Image upload failed!');
            return res.redirect('/create-post');
        }

        // find the authenticated user from the DB
        const user = await User.findById(req.session.user._id);

        // create new post
        const post = new Post({ title, slug, content, image, user });

        // now we need to also update the user's model
        // save post in user posts array
        await User.updateOne({ _id: req.session.user._id }, { $push: { posts: post._id } }),

            await post.save();
        req.flash('success', 'Post created successfully');
        res.redirect('/my-posts');
    } catch (error) {
        console.log(error);
        req.flash('error', 'Error creating new post');
        res.redirect('/create-post');
    }

});

// !Handle delete post request 
router.post('/delete-post/:id', protectedRoute, async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);

        if (!post) {
            req.flash('error', 'Post Not found');
            res.redirect('/my-posts');
        }

        // This will remove the post id from the users array list
        await User.updateOne({ _id: req.session.user._id }, { $pull: { posts: postId } });

        // and then we'll delete the main post
        await Post.deleteOne({ _id: postId });

        // we'll also remove the file from the folder directory
        unlink(path.join(process.cwd(), 'uploads') + '/' + post.iamge, (err) => {
            if (err) {
                console.error(err);
            }
        });

        req.flash('success', 'Post deleted successfully');
        res.redirect('/my-posts');

    } catch (error) {
        console.error(error);
        req.flash('error', 'Error deleting post');
        res.redirect('/my-posts');
    }
});

export default router;
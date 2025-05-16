import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import path from 'path';
import http from 'http';
import jwt from 'jsonwebtoken';
import { Binary } from 'mongodb';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { connectToDB } from './db.mjs';
import userRoutes from './Routes/userRoutes.mjs'

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 8080;

app.use('/M00671293/users', userRoutes);

io.on('connection', (socket) => {
  console.log('A user connected');

  // Example event handler
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to validate JWT
function authenticateToken(req, res, next) {
  const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1]; // Get token from "Authorization: Bearer <token>"

  // If no token, it's okay for new users or non-authenticated requests
  if (!token) {
    return next(); // Let the request pass without authentication (new users or non-restricted routes)
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user; // Attach user info from the token to the request
    next(); // Continue to the next middleware or route
  });
}


// Serve static files from /Public
app.use(express.static(path.join(__dirname, 'Public')));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan('dev'));

// Main route for /M00671293
app.get('/M00671293', (req, res) => {
  console.log('Accessed main route /M00671293');
  res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

// ================= // USER REGISTRATION // ================= //
app.post('/M00671293/users', async (req, res) => {
  const { firstName, lastName, username, email, password } = req.body;

  // Check if all required fields are provided
  if (!firstName || !lastName || !username || !email || !password) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  // Regex to validate username and email format
  const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Validate username
  if (!usernameRegex.test(username)) {
    return res.status(400).json({
      error: 'Username can only contain letters, numbers, underscores, hyphens, and periods.',
    });
  }

  // Validate email
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  try {
    // Connect to database
    const { db } = await connectToDB();
    const usersCollection = db.collection('Users');

    // Check if username or email already exists in the database
    const existingUser = await usersCollection.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      // Return error message if username or email already exists
      const errorMessage =
        existingUser.username === username
          ? 'Username already exists.'
          : 'Email already exists.';
      return res.status(409).json({ error: errorMessage });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into the database
    const result = await usersCollection.insertOne({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
    });

    // Generate JWT token after successful registration
    const token = jwt.sign(
      { userId: result.insertedId, username },
      process.env.SECRET_KEY,
      { expiresIn: '1h' } // Set expiration time to 1 hour
    );

    // Respond with success message and token
    return res.status(201).json({
      message: 'User registered successfully.',
      token, // Send the JWT token in the response
      redirect: '/M00671293', // Redirect URL after successful registration
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// EDIT PROFILE 
app.post('/M00671293/users/editProfile', authenticateToken, async (req, res) => {
  console.log("Edit profile request received");

  const { firstName, lastName, bio, profilePicture } = req.body;
  const userId = req.user.userId;
  console.log("Received data for update:", { firstName, lastName, bio, profilePicture });

  const updatedProfile = {};

  if (firstName) updatedProfile.firstName = firstName;
  if (lastName) updatedProfile.lastName = lastName;
  if (bio) updatedProfile.bio = bio;

  // Handle the profile picture if it's provided
  if (profilePicture) {
    try {
      console.log("Processing profile picture...");
      const imageBuffer = Buffer.from(profilePicture, 'base64');
      updatedProfile.profilePicture = new Binary(imageBuffer); // MongoDB BinData type
    } catch (error) {
      console.error('Error processing profile picture:', error);
      return res.status(500).json({ error: 'Error processing profile picture' });
    }
  }

  try {
    console.log("Connecting to the database...");
    const { db } = await connectToDB();
    const usersCollection = db.collection('Users');

    console.log("Updating user in the database...");
    // Update the user's profile data in the database
    const updateResult = await usersCollection.updateOne(
      { _id: userId },
      { $set: updatedProfile }  // Update the profile with new data
    );

    if (updateResult.matchedCount === 0) {
      console.error("User not found.");
      return res.status(404).json({ error: 'User not found' });
    }

    console.log("Profile updated successfully.");
    return res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ================= // USER LOGIN // ================= //
app.post('/M00671293/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const { db } = await connectToDB();
    const usersCollection = db.collection('Users');
    const user = await usersCollection.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Create a JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.SECRET_KEY,
      { expiresIn: '1d' } // Token valid for 1 day
    );

    // Return the response with first name, last name, and token
    return res.status(200).json({
      message: 'Login successful.',
      token,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});


//GET /login: check login status
app.get('/M00671293/login', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Extract JWT token from the Authorization header

  if (!token) {
    return res.status(200).json({ isLoggedIn: false }); // No token means not logged in
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(200).json({ isLoggedIn: false }); // Invalid or expired token means not logged in
    }

    // If token is valid, user is logged in
    res.status(200).json({
      isLoggedIn: true,
      userId: user.userId,
      username: user.username, // Optional: you can return additional user data
    });
  });
});

// DELETE /login: log user out
app.delete('/M00671293/login', (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
});

// ========================  USER UPLOADS ======================== //
// POST route for creating content
app.post('/M00671293/contents', async (req, res) => {
  try {
    const { username, content, image } = req.body;

    // Validate input
    if (!username || !content || !Array.isArray(image)) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    // Connect to the database
    const { db } = await connectToDB();
    const collection = db.collection('Contents');

    // Log connection success to the 'Contents' collection
    console.log('Successfully connected to the Contents collection.');

    // Prepare post data
    const postData = {
      username,
      content,
      image,
      createdAt: new Date()
    };

    // Insert post into the database
    const result = await collection.insertOne(postData);

    if (result.acknowledged) {
      return res.status(200).json({ success: true, post: postData });
    } else {
      return res.status(500).json({ error: 'Failed to insert post into database' });
    }
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /contents/:postId/comments: 
app.post('/M00671293/contents/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { username, commentText } = req.body;

    // Ensure postId is correctly included in the comment
    const comment = {
      postId,
      username,
      commentText,
      createdAt: new Date(),
    };

    // Store the comment in the database
    const { db } = await connectToDB();
    const commentsCollection = db.collection('UserLikesNComments');

    const result = await commentsCollection.insertOne(comment);

    res.status(201).json({ message: 'Comment created successfully', comment: result.ops[0] });
  } catch (error) {
    console.error('Error saving comment:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


// GET /contents: retrieve user posts along with their comments
app.get('/M00671293/contents', async (req, res) => {
  try {
    const { db } = await connectToDB();
    const contentsCollection = db.collection('Contents');
    const commentsCollection = db.collection('UserLikesNComments');

    // Retrieve all posts
    const posts = await contentsCollection.find().toArray();

    // For each post, retrieve associated comments
    for (let post of posts) {
      const comments = await commentsCollection.find({ postId: post._id }).toArray();
      post.comments = comments;
    }

    res.status(200).json(posts);
  } catch (error) {
    console.error('Error retrieving posts and comments:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ======================== USER PROFILE ======================== //
// GET /M00671293/users/:username: fetch user profile by username
app.get('/M00671293/users/:username', async (req, res) => {
  const { username } = req.params; // Get the username from the route parameter
  
  if (!username) {
    return res.status(400).json({ error: "Username is required." });
  }

  try {
    const { db } = await connectToDB();
    const usersCollection = db.collection('Users');

    // Find the user by their username
    const user = await usersCollection.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Safely check if posts, followers, and followings exist
    const postsCount = user.posts ? user.posts.length : 0;
    const followersCount = user.followers ? user.followers.length : 0;
    const followingsCount = user.followings ? user.followings.length : 0;

    // Respond with user profile data, including the 'username'
    res.json({
      success: true,
      username: user.username,  // Add the username field here
      name: user.firstName + ' ' + user.lastName,
      postsCount,
      followersCount,
      followingsCount,
      bio: user.bio || 'No bio available',
      posts: user.posts || []  
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ========================  USER SEARCH ======================== //
// GET /M00671293/users/search: search users based on query
app.get('/M00671293/users/search', async (req, res) => { 
  const query = req.query.q; 
  console.log('Search request received with query:', req.query.q);  

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required." });
  }

  try {
    const { db } = await connectToDB();
    const usersCollection = db.collection('Users');
    const users = await usersCollection.find({
      username: { $regex: query, $options: 'i' }
    }).toArray();

    console.log('Found users:', users);  

    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found.' });
    }

    res.json(users);  
  } catch (err) {
    console.error('Database error:', err);  
    res.status(500).json({ error: 'Server error' });
  }
});




// ========================  CONTENT SEARCH ======================== //
// GET /M00671293/contents/search: search contents based on query
app.get('/M00671293/contents/search', async (req, res) => {
  const query = req.query.q;  // Get the query parameter "q"

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required." });
  }

  try {
    const { db } = await connectToDB();
    const contentsCollection = db.collection('Contents');

    // Search for content by title, body, or tags (case-insensitive)
    const contents = await contentsCollection.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { body: { $regex: query, $options: 'i' } },
        { tags: { $in: [query] } }
      ]
    }).toArray();

    res.json(contents);  // Return matched contents in JSON format
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========================  FOLLOW USER ======================== //
// POST /M00671293/follow: Follow another user
app.post('/M00671293/follow', authenticateToken, async (req, res) => {
  const { followedId } = req.body;  // Get the followed user's ID from the request body

  if (!followedId) {
    return res.status(400).json({ error: "followedId is required." });
  }

  try {
    const { db } = await connectToDB();
    const followsCollection = db.collection('Follows');
    const followerId = req.user.userId;  // The user who is following (from JWT token)

    // Check if the user is already following the target user
    const existingFollow = await followsCollection.findOne({
      followerId,
      followedId
    });

    if (existingFollow) {
      return res.status(400).json({ error: 'You are already following this user.' });
    }

    // Store the follow relationship in the database
    const followData = {
      followerId,
      followedId,
      createdAt: new Date()
    };

    const result = await followsCollection.insertOne(followData);

    if (result.acknowledged) {
      return res.status(201).json({ message: 'Successfully followed the user.' });
    } else {
      return res.status(500).json({ error: 'Failed to follow the user.' });
    }
  } catch (error) {
    console.error('Error following user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================  UNFOLLOW USER ======================== //
// DELETE /M00671293/follow: Unfollow another user
app.delete('/M00671293/follow', authenticateToken, async (req, res) => {
  const { followedId } = req.body;  // Get the followed user's ID from the request body

  if (!followedId) {
    return res.status(400).json({ error: "followedId is required." });
  }

  try {
    const { db } = await connectToDB();
    const followsCollection = db.collection('Follows');
    const followerId = req.user.userId;  // The user who is unfollowing (from JWT token)

    // Find the follow relationship to delete
    const result = await followsCollection.deleteOne({
      followerId,
      followedId
    });

    if (result.deletedCount === 0) {
      return res.status(400).json({ error: 'You are not following this user.' });
    }

    return res.status(200).json({ message: 'Successfully unfollowed the user.' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// ================= // SERVER START // ================= //
(async () => {
  try {
    await connectToDB();
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}/M00671293`);
    });
  } catch (error) {
    console.error('Error starting the server:', error);
  }
})();

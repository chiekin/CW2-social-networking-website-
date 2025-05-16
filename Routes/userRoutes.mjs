import express from 'express';
import { connectToDB } from '../db.mjs';

const router = express.Router();

// GET /search route to search users based on query parameter
router.get('/search', async (req, res) => {
    const query = req.query.q;
    console.log('Search request received with query:', query);
  
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required." });
    }
  
    try {
      const { db } = await connectToDB();
      const usersCollection = db.collection('Users');
  
      // Search users by username using regular expression
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
  
  export default router;
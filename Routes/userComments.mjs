import express from 'express';
import { connectToDB } from '../db.mjs';

// Create a comment for a post
async function createComment(req, res) {
    try {
      const { postId } = req.params;
      const { username, commentText } = req.body;
  
      // Validate that the required fields are provided
      if (!username || !commentText) {
        return res.status(400).json({ error: 'Username and comment text are required.' });
      }
  
      // Create the comment object
      const comment = {
        postId,
        username,
        commentText,
        createdAt: new Date(),
      };
  
      // Connect to the database and insert the comment
      const { db } = await connectToDB();
      const commentsCollection = db.collection('UserLikesNComments');
  
      const result = await commentsCollection.insertOne(comment);
  
      // Respond with the created comment
      res.status(201).json({ 
        message: 'Comment created successfully', 
        comment: { ...result.ops[0], id: result.insertedId }  // Add insertedId
      });
  
    } catch (error) {
      console.error('Error saving comment:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
  
  module.exports = { createComment };
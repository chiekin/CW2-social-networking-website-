# Daikonnect - Social Networking Website

## Project Overview
Daikonnect is a full-featured social networking platform developed as part of the CST2120 coursework. The name derives from "Daikon" (Japanese radish), reflected in the green-themed color scheme complemented by additional accent colors.

## Features
- **User Authentication**: Secure registration and login system using JWT tokens
- **User Profiles**: Customizable user profiles with edit functionality
- **Social Feed**: Dynamic content posting with image upload capability
- **Interaction**: Comment system on posts
- **User Search**: Find other users through the search functionality
- **Responsive Design**: Optimized for different screen sizes

## Technology Stack
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js with Express.js
- **Authentication**: JWT (JSON Web Tokens)
- **API Testing**: Postman
- **Database**: MongoDB

## Project Structure
- **Authentication Page**: Entry point for registration and login
- **Homepage**: Main feed with sidebar navigation and posting functionality
- **Profile Page**: View user information with conditional edit options
- **API Endpoints**:
  - POST /login - User authentication
  - GET /login - Check login status
  - DELETE /login - User logout
  - POST /register - New user registration
  - GET /users/search - Find users
 
## Installation and Setup
1. Clone this repository
2. Install dependencies: `npm install`
3. Configure environment variables
4. Start the server: `npm start`
5. Access the application at `http://localhost:8080`

# Social Media App

A simple social media web app built with Node.js, Express, and SQLite.

## Features
- User registration and login
- Profile pages with follower counts
- Post creation with image/video upload
- Likes and comments
- Tagging support and trending tags
- Notifications for likes, comments, follows, and new posts

## Run locally
1. Install dependencies:

   npm install

2. Start the server:

   npm start

3. Open `http://localhost:4000` in your browser.

## Notes
- The app uses `uploads/` for media files and `data/social.db` for the SQLite database.
- Use the `x-user-id` header for authenticated requests in API clients.

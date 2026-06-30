# Real-Time Chat Application

A lightweight real-time chat app built with Express and WebSocket (`ws`).

## Features

- Account registration and login
- Chat rooms
- Private messaging
- Real-time presence updates
- Chat history persistence

## Setup

1. Open a terminal in the project folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open `http://localhost:4000` in your browser.

## Usage

- Register a username and password.
- Join or create chat rooms.
- Click an online user to start a private conversation.
- Messages are stored in `data.json`.

## Notes

- This project is a starting point. In production, update `JWT_SECRET` and use HTTPS.
- You can extend it with file sharing, notifications, richer UI, and database-backed storage.

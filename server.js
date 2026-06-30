const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const port = process.env.PORT || 4000;
const baseDir = __dirname;
const dataDir = path.join(baseDir, "data");
const uploadDir = path.join(baseDir, "uploads");
const dbFile = path.join(dataDir, "social.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_.]/g, "_");
    cb(null, `${timestamp}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }
});

const db = new sqlite3.Database(dbFile, err => {
  if (err) return console.error("Failed to open database:", err.message);
});

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatarUrl TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      content TEXT,
      mediaUrl TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      postId INTEGER NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(userId, postId),
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(postId) REFERENCES posts(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      postId INTEGER NOT NULL,
      text TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(postId) REFERENCES posts(id)
    );

    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      followerId INTEGER NOT NULL,
      followedId INTEGER NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(followerId, followedId),
      FOREIGN KEY(followerId) REFERENCES users(id),
      FOREIGN KEY(followedId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      type TEXT NOT NULL,
      sourceUserId INTEGER,
      postId INTEGER,
      message TEXT,
      isRead INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(sourceUserId) REFERENCES users(id),
      FOREIGN KEY(postId) REFERENCES posts(id)
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS post_tags (
      postId INTEGER NOT NULL,
      tagId INTEGER NOT NULL,
      PRIMARY KEY(postId, tagId),
      FOREIGN KEY(postId) REFERENCES posts(id),
      FOREIGN KEY(tagId) REFERENCES tags(id)
    );
  `;

  db.exec(schema, err => {
    if (err) {
      console.error("Failed to initialize database schema:", err.message);
    }
  });
}

function getCurrentUserId(req) {
  const id = parseInt(req.headers["x-user-id"], 10);
  return Number.isInteger(id) ? id : null;
}

function normalizeTags(tagString) {
  return (tagString || "")
    .split(",")
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean)
    .filter((tag, index, array) => array.indexOf(tag) === index);
}

async function createNotification(userId, type, sourceUserId, postId, message) {
  if (!userId || userId === sourceUserId) return;
  await dbRun(
    `INSERT INTO notifications (userId, type, sourceUserId, postId, message) VALUES (?, ?, ?, ?, ?)`,
    [userId, type, sourceUserId, postId, message]
  );
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(baseDir, "public")));
app.use("/uploads", express.static(uploadDir));

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, username, password, bio } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: "Name, username, and password are required." });
    }

    const existing = await dbGet("SELECT id FROM users WHERE username = ?", [username]);
    if (existing) {
      return res.status(400).json({ error: "Username already exists." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const avatarUrl = `https://api.dicebear.com/6.x/thumbs/png?seed=${encodeURIComponent(username)}`;
    const { lastID } = await dbRun(
      "INSERT INTO users (name, username, password, bio, avatarUrl) VALUES (?, ?, ?, ?, ?)",
      [name, username, hashed, bio || "", avatarUrl]
    );

    const user = await dbGet(
      "SELECT id, name, username, bio, avatarUrl, createdAt FROM users WHERE id = ?",
      [lastID]
    );
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to register user." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const user = await dbGet("SELECT id, name, username, password, bio, avatarUrl, createdAt FROM users WHERE username = ?", [username]);
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    delete user.password;
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to login." });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const profileId = parseInt(req.params.id, 10);
    const currentUserId = getCurrentUserId(req);
    const user = await dbGet(
      "SELECT id, name, username, bio, avatarUrl, createdAt FROM users WHERE id = ?",
      [profileId]
    );
    if (!user) return res.status(404).json({ error: "User not found." });

    const postsCount = await dbGet("SELECT COUNT(*) AS count FROM posts WHERE userId = ?", [profileId]);
    const followersCount = await dbGet("SELECT COUNT(*) AS count FROM follows WHERE followedId = ?", [profileId]);
    const followingCount = await dbGet("SELECT COUNT(*) AS count FROM follows WHERE followerId = ?", [profileId]);

    const followState = currentUserId
      ? await dbGet(
          "SELECT 1 FROM follows WHERE followerId = ? AND followedId = ?",
          [currentUserId, profileId]
        )
      : null;

    res.json({
      ...user,
      postsCount: postsCount.count,
      followersCount: followersCount.count,
      followingCount: followingCount.count,
      isFollowing: !!followState
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to load profile." });
  }
});

app.post("/api/users/:id/follow", async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const targetId = parseInt(req.params.id, 10);
    const { action } = req.body;
    if (!currentUserId) return res.status(401).json({ error: "Login required." });
    if (currentUserId === targetId) return res.status(400).json({ error: "Cannot follow yourself." });

    if (action === "follow") {
      await dbRun("INSERT OR IGNORE INTO follows (followerId, followedId) VALUES (?, ?)", [currentUserId, targetId]);
      await createNotification(targetId, "follow", currentUserId, null, "started following you.");
    } else {
      await dbRun("DELETE FROM follows WHERE followerId = ? AND followedId = ?", [currentUserId, targetId]);
    }

    res.json({ success: true, action });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update follow state." });
  }
});

app.get("/api/posts", async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const feedOnly = req.query.feed === "true";
    const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
    const tagName = req.query.tag || null;
    const params = [currentUserId, currentUserId];
    let whereClauses = [];

    if (feedOnly && currentUserId) {
      whereClauses.push(`p.userId IN (SELECT followedId FROM follows WHERE followerId = ?)`);
      params.push(currentUserId);
    }
    if (userId) {
      whereClauses.push("p.userId = ?");
      params.push(userId);
    }
    if (tagName) {
      whereClauses.push(
        `p.id IN (SELECT postId FROM post_tags WHERE tagId = (SELECT id FROM tags WHERE name = ?))`
      );
      params.push(tagName.toLowerCase());
    }

    const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const posts = await dbAll(
      `SELECT p.id, p.userId, p.content, p.mediaUrl, p.createdAt, u.name, u.username, u.avatarUrl,
              COUNT(DISTINCT l.id) AS likeCount,
              COUNT(DISTINCT c.id) AS commentCount,
              MAX(CASE WHEN l.userId = ? THEN 1 ELSE 0 END) AS liked,
              GROUP_CONCAT(DISTINCT t.name) AS tags
       FROM posts p
       JOIN users u ON u.id = p.userId
       LEFT JOIN likes l ON l.postId = p.id
       LEFT JOIN comments c ON c.postId = p.id
       LEFT JOIN post_tags pt ON pt.postId = p.id
       LEFT JOIN tags t ON t.id = pt.tagId
       ${whereClause}
       GROUP BY p.id
       ORDER BY p.createdAt DESC
       LIMIT 100`,
      params
    );

    const data = posts.map(post => ({
      ...post,
      liked: !!post.liked,
      likeCount: Number(post.likeCount || 0),
      commentCount: Number(post.commentCount || 0),
      tags: post.tags ? post.tags.split(",") : []
    }));

    res.json({ posts: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to load posts." });
  }
});

app.post("/api/posts", upload.single("media"), async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) return res.status(401).json({ error: "Login required." });

    const { content, tags } = req.body;
    const mediaUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const { lastID } = await dbRun(
      "INSERT INTO posts (userId, content, mediaUrl) VALUES (?, ?, ?)",
      [currentUserId, content || "", mediaUrl]
    );

    const tagList = normalizeTags(tags);
    for (const tag of tagList) {
      await dbRun("INSERT OR IGNORE INTO tags (name) VALUES (?)", [tag]);
      const tagRow = await dbGet("SELECT id FROM tags WHERE name = ?", [tag]);
      if (tagRow) {
        await dbRun("INSERT OR IGNORE INTO post_tags (postId, tagId) VALUES (?, ?)", [lastID, tagRow.id]);
      }
    }

    const followers = await dbAll("SELECT followerId FROM follows WHERE followedId = ?", [currentUserId]);
    for (const follower of followers) {
      await createNotification(
        follower.followerId,
        "new_post",
        currentUserId,
        lastID,
        "shared a new post."
      );
    }

    res.json({
      post: {
        id: lastID,
        userId: currentUserId,
        content: content || "",
        mediaUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0,
        liked: false,
        tags: tagList
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to publish post." });
  }
});

app.post("/api/posts/:id/like", async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const postId = parseInt(req.params.id, 10);
    if (!currentUserId) return res.status(401).json({ error: "Login required." });

    const existing = await dbGet("SELECT id, userId FROM likes WHERE userId = ? AND postId = ?", [currentUserId, postId]);
    if (existing) {
      await dbRun("DELETE FROM likes WHERE id = ?", [existing.id]);
      return res.json({ liked: false });
    }

    const post = await dbGet("SELECT userId FROM posts WHERE id = ?", [postId]);
    await dbRun("INSERT INTO likes (userId, postId) VALUES (?, ?)", [currentUserId, postId]);
    if (post) {
      await createNotification(post.userId, "like", currentUserId, postId, "liked your post.");
    }
    res.json({ liked: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update like." });
  }
});

app.post("/api/posts/:id/comment", async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const postId = parseInt(req.params.id, 10);
    const { text } = req.body;
    if (!currentUserId) return res.status(401).json({ error: "Login required." });
    if (!text) return res.status(400).json({ error: "Comment text is required." });

    const { lastID } = await dbRun(
      "INSERT INTO comments (userId, postId, text) VALUES (?, ?, ?)",
      [currentUserId, postId, text]
    );

    const post = await dbGet("SELECT userId FROM posts WHERE id = ?", [postId]);
    if (post) {
      await createNotification(post.userId, "comment", currentUserId, postId, "commented on your post.");
    }

    const comment = await dbGet(
      `SELECT c.id, c.text, c.createdAt, u.id AS userId, u.name, u.username, u.avatarUrl
       FROM comments c
       JOIN users u ON u.id = c.userId
       WHERE c.id = ?`,
      [lastID]
    );

    res.json({ comment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to add comment." });
  }
});

app.get("/api/posts/:id", async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = getCurrentUserId(req);
    const post = await dbGet(
      `SELECT p.id, p.userId, p.content, p.mediaUrl, p.createdAt, u.name, u.username, u.avatarUrl,
              COUNT(DISTINCT l.id) AS likeCount,
              COUNT(DISTINCT c.id) AS commentCount,
              MAX(CASE WHEN l.userId = ? THEN 1 ELSE 0 END) AS liked,
              GROUP_CONCAT(DISTINCT t.name) AS tags
       FROM posts p
       JOIN users u ON u.id = p.userId
       LEFT JOIN likes l ON l.postId = p.id
       LEFT JOIN comments c ON c.postId = p.id
       LEFT JOIN post_tags pt ON pt.postId = p.id
       LEFT JOIN tags t ON t.id = pt.tagId
       WHERE p.id = ?
       GROUP BY p.id`,
      [currentUserId, postId]
    );

    if (!post) return res.status(404).json({ error: "Post not found." });

    const comments = await dbAll(
      `SELECT c.id, c.text, c.createdAt, u.id AS userId, u.name, u.username, u.avatarUrl
       FROM comments c
       JOIN users u ON u.id = c.userId
       WHERE c.postId = ?
       ORDER BY c.createdAt ASC`,
      [postId]
    );

    res.json({
      post: {
        ...post,
        liked: !!post.liked,
        likeCount: Number(post.likeCount || 0),
        commentCount: Number(post.commentCount || 0),
        tags: post.tags ? post.tags.split(",") : []
      },
      comments
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to load post." });
  }
});

app.get("/api/notifications", async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) return res.status(401).json({ error: "Login required." });

    const notifications = await dbAll(
      `SELECT n.id, n.type, n.message, n.isRead, n.createdAt,
              u.id AS sourceUserId, u.name AS sourceName, u.username AS sourceUsername, u.avatarUrl AS sourceAvatar,
              n.postId
       FROM notifications n
       LEFT JOIN users u ON u.id = n.sourceUserId
       WHERE n.userId = ?
       ORDER BY n.createdAt DESC
       LIMIT 50`,
      [currentUserId]
    );

    res.json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to load notifications." });
  }
});

app.get("/api/trending", async (req, res) => {
  try {
    const tags = await dbAll(
      `SELECT t.name, COUNT(pt.tagId) AS count
       FROM tags t
       JOIN post_tags pt ON pt.tagId = t.id
       GROUP BY t.id
       ORDER BY count DESC
       LIMIT 12`
    );
    res.json({ tags });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to load trending content." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(baseDir, "public", "index.html"));
});

initDatabase();

app.listen(port, () => {
  console.log(`Social media server running at http://localhost:${port}`);
});

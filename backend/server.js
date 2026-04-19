require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();

const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "mini_project";
const SESSION_SECRET = process.env.SESSION_SECRET || "development_secret";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

if (!MONGO_URI) {
  throw new Error("MONGO_URI is required");
}

const client = new MongoClient(MONGO_URI);
let db = null;

async function connectToDB() {
  if (!db) {
    await client.connect();
    db = client.db(DB_NAME);
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("messages").createIndex({ userId: 1, createdAt: -1 });
    console.log("MongoDB connected");
  }
  return db;
}

function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    email: user.email
  };
}

function authMiddleware(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "authentication required" });
  }
  next();
}

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(session({
  name: "sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    dbName: DB_NAME,
    collectionName: "sessions"
  }),
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.get("/", (req, res) => {
  res.send("Server running");
});

app.get("/auth/me", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "not authenticated" });
    }
    const database = await connectToDB();
    const user = await database.collection("users").findOne({
      _id: new ObjectId(req.session.userId)
    });
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "user not found" });
    }
    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ error: "server error" });
  }
});

app.post("/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "password must be at least 6 characters long" });
    }
    const database = await connectToDB();
    const existingUser = await database.collection("users").findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "email already in use" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await database.collection("users").insertOne({
      email,
      password: hashedPassword,
      createdAt: new Date()
    });
    req.session.userId = result.insertedId.toString();
    res.status(201).json({
      message: "signup successful",
      user: { id: result.insertedId.toString(), email }
    });
  } catch (error) {
    res.status(500).json({ error: "server error" });
  }
});

app.post("/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const database = await connectToDB();
    const user = await database.collection("users").findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    req.session.userId = user._id.toString();
    res.json({ message: "signin successful", user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ error: "server error" });
  }
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ error: "logout failed" });
    }
    res.clearCookie("sid", { httpOnly: true, sameSite: "lax", secure: false });
    res.json({ message: "logout successful" });
  });
});

app.get("/messages", authMiddleware, async (req, res) => {
  try {
    const database = await connectToDB();
    const messages = await database
      .collection("messages")
      .find({ userId: req.session.userId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "server error" });
  }
});

app.post("/messages", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "text is required" });
    }
    const database = await connectToDB();
    await database.collection("messages").insertOne({
      text: text.trim(),
      userId: req.session.userId,
      createdAt: new Date()
    });
    const messages = await database
      .collection("messages")
      .find({ userId: req.session.userId })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(201).json(messages);
  } catch (error) {
    res.status(500).json({ error: "server error" });
  }
});

connectToDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
  });

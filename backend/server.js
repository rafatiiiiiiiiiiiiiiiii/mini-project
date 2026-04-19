require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();

const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "mini_project";

if (!MONGO_URI) {
  throw new Error("MONGO_URI is required");
}

app.use(cors());
app.use(express.json());

const client = new MongoClient(MONGO_URI);
let db = null;

/**
 * DOCSTRING EXAMPLE (JSDoc)
 * 
 * Connects the application to the MongoDB database and returns
 * the database instance. If a connection already exists, it is reused.
 *
 * @async
 * @function connectToDB
 * @returns {Promise<import("mongodb").Db>} A promise that resolves to the MongoDB database instance.
 *
 * @example
 * const db = await connectToDB();
 * const users = await db.collection("users").find({}).toArray();
 * console.log(users);
 *
 * @throws {Error} Throws an error if the MongoDB connection fails.
 */
async function connectToDB() {
  if (!db) {
    await client.connect();
    db = client.db(DB_NAME);
    console.log("MongoDB connected");
  }

  return db;
}

app.get("/", (req, res) => {
  res.send("Server running");
});

app.get("/messages", async (req, res) => {
  try {
    const database = await connectToDB();
    const messages = await database
      .collection("messages")
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "server error" });
  }
});

app.post("/messages", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "text is required" });
    }

    const database = await connectToDB();

    await database.collection("messages").insertOne({
      text: text.trim(),
      createdAt: new Date()
    });

    const messages = await database
      .collection("messages")
      .find()
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

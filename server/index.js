const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ── Environment Variables ─────────────────────────────────
const PORT          = process.env.PORT          || 5000;
const MONGODB_URI   = process.env.MONGODB_URI;
const DB_NAME       = process.env.DB_NAME       || 'PORTFOLIOODB';
const FRONTEND_URL  = process.env.FRONTEND_URL  || 'http://localhost:5173';
const COLLECTION_NAME = 'Jobs '; // Case-sensitive (trailing space intentional)

// ── Validate required env vars ────────────────────────────
if (!MONGODB_URI) {
  console.error('❌  CRITICAL: MONGODB_URI is not set in environment.');
  // Don't process.exit() in serverless — just log and let routes return 503
}

// ── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin: [
    FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ── MongoDB Connection (cached for serverless warm reuse) ─
// In serverless, connections are reused across invocations if the module
// is kept warm. We cache the client globally for this reason.
let cachedClient = null;
let cachedCollection = null;

async function getCollection() {
  if (cachedCollection) return cachedCollection;

  if (!MONGODB_URI) throw new Error('MONGODB_URI is not defined.');

  cachedClient = new MongoClient(MONGODB_URI);
  await cachedClient.connect();
  console.log('✅  Connected to MongoDB Atlas');
  const db = cachedClient.db(DB_NAME);
  cachedCollection = db.collection(COLLECTION_NAME);
  return cachedCollection;
}

// ── Routes ────────────────────────────────────────────────

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'CareerSync AI API', version: '1.0.0' });
});

// GET /api/jobs — fetch all matched jobs sorted by score
app.get('/api/jobs', async (req, res) => {
  try {
    const collection = await getCollection();
    const jobs = await collection.find({}).sort({ match_score: -1, created_at: -1 }).toArray();
    res.json(jobs);
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(503).json({ error: err.message || 'Database error' });
  }
});

// POST /api/jobs — save a new matched job (called from n8n HTTP Request node)
app.post('/api/jobs', async (req, res) => {
  const { title, url } = req.body;

  // Basic validation to prevent saving invalid empty/null documents
  if (!title || !url) {
    return res.status(400).json({
      error: 'Bad Request: "title" and "url" are required fields and cannot be empty.'
    });
  }

  try {
    const collection = await getCollection();
    const job = {
      ...req.body,
      match_score: Number(req.body.match_score) || 0,
      created_at: new Date(),
    };
    const result = await collection.insertOne(job);
    res.status(201).json({ success: true, insertedId: result.insertedId });
  } catch (err) {
    console.error('Error saving job:', err);
    res.status(503).json({ error: err.message || 'Database error' });
  }
});

// DELETE /api/jobs/:id — delete a job application
app.delete('/api/jobs/:id', async (req, res) => {
  const jobId = req.params.id;
  try {
    const collection = await getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(jobId) });
    if (result.deletedCount === 1) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Job listing not found' });
    }
  } catch (err) {
    console.error('Error deleting job:', err);
    res.status(500).json({ error: 'Invalid ID format or Internal Server Error' });
  }
});

// ── Local dev: start server normally ─────────────────────
// In Vercel serverless, app.listen() is NOT called — module.exports handles it.
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀  CareerSync API running on http://localhost:${PORT}`);
    console.log(`   Frontend allowed: ${FRONTEND_URL}`);
    console.log(`   Database: ${DB_NAME}`);
  });
}

// ── Export for Vercel Serverless ──────────────────────────
module.exports = app;

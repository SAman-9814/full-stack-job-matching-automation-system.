const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set in .env');
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('Successfully connected to MongoDB.');

    // 1. List all databases
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('\n--- DATABASES ON YOUR ATLAS CLUSTER ---');
    dbs.databases.forEach(db => console.log(`- ${db.name}`));

    // 2. Scan the configured DB name
    const configuredDbName = process.env.DB_NAME || 'test';
    console.log(`\n--- SCANNING DATABASE: ${configuredDbName} ---`);
    const db = client.db(configuredDbName);
    const collections = await db.listCollections().toArray();
    console.log('Collections:');
    collections.forEach(col => console.log(`- ${col.name}`));

    // 3. Check for the 'Jobs' collection
    const collectionName = 'Jobs';
    const collection = db.collection(collectionName);
    const count = await collection.countDocuments({});
    console.log(`\nDocument count in '${collectionName}' collection: ${count}`);

    if (count > 0) {
      const docs = await collection.find({}).limit(3).toArray();
      console.log('\nSample Documents:');
      console.log(JSON.stringify(docs, null, 2));
    } else {
      console.log(`\nWARNING: The collection '${collectionName}' is empty in database '${configuredDbName}'.`);
      console.log('Checking other databases for documents...');
      for (const dbInfo of dbs.databases) {
        if (dbInfo.name === 'admin' || dbInfo.name === 'local') continue;
        const otherDb = client.db(dbInfo.name);
        const otherCols = await otherDb.listCollections().toArray();
        for (const col of otherCols) {
          const c = await otherDb.collection(col.name).countDocuments({});
          if (c > 0) {
            console.log(`Found active collection: DB='${dbInfo.name}', Collection='${col.name}' has ${c} documents.`);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await client.close();
  }
}

run();

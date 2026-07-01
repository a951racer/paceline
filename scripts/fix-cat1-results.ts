/**
 * One-time script to fix race results that were stored with the old "cat1" category key.
 * Maps them to the new "pro" key.
 *
 * Run with: npx ts-node scripts/fix-cat1-results.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set in .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const result = await mongoose.connection.db!.collection("raceresults").updateMany(
    { category: "cat1" },
    { $set: { category: "pro" } }
  );

  console.log(`Updated ${result.modifiedCount} race result(s) from "cat1" to "pro"`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

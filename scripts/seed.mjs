// Creates (or resets the password of) the super admin user.
// Usage:  npm run seed
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
const email = (process.env.SUPERADMIN_EMAIL || "").toLowerCase();
const password = process.env.SUPERADMIN_PASSWORD || "";
if (!email || !password) {
  console.error("Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in .env.local first.");
  process.exit(1);
}
if (!uri) {
  console.error("MONGODB_URI missing. Run with: npm run seed");
  process.exit(1);
}

await mongoose.connect(uri);
const users = mongoose.connection.collection("users");
const passwordHash = await bcrypt.hash(password, 10);
await users.updateOne(
  { email },
  {
    $set: { passwordHash, role: "superadmin" },
    $setOnInsert: { name: "Super Admin", email, phone: "", createdAt: new Date(), updatedAt: new Date() },
  },
  { upsert: true },
);
console.log(`Super admin ready → ${email} / ${password}`);
await mongoose.disconnect();

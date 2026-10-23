/**
 * Admin Seed Script
 * Usage: node scripts/seedAdmin.js
 * Requires MONGO_URI and ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME in .env
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME in server/.env');
  process.exit(1);
}

await mongoose.connect(MONGO_URI);

const existing = await User.findOne({ email: ADMIN_EMAIL });
if (existing) {
  if (existing.role === 'ADMIN') {
    console.log(`Admin already exists: ${existing.email}`);
  } else {
    existing.role = 'ADMIN';
    await existing.save();
    console.log(`Promoted ${existing.email} to ADMIN`);
  }
} else {
  await User.create({
    name: ADMIN_NAME || 'Admin',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'ADMIN',
  });
  console.log(`Admin created: ${ADMIN_EMAIL}`);
}

await mongoose.disconnect();
process.exit(0);

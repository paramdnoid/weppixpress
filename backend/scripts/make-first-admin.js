#!/usr/bin/env node
import pool from '../db.js';
import { getAllUsers, updateUserRole } from '../models/userModel.js';
import dotenv from 'dotenv';

dotenv.config();

async function makeFirstAdmin() {
  try {
    const users = await getAllUsers();
    
    if (users.length === 0) {
      console.log('❌ No users found in the database');
      process.exit(1);
    }

    // Find the first user or any user that should be made admin
    const firstUser = users[0];
    
    if (firstUser.role === 'admin') {
      console.log(`✅ User ${firstUser.email} is already an admin`);
    } else {
      await updateUserRole(firstUser.id, 'admin');
      console.log(`✅ User ${firstUser.email} has been promoted to admin`);
    }

    // Display all users and their roles
    console.log('\n📋 Current users:');
    const updatedUsers = await getAllUsers();
    updatedUsers.forEach(user => {
      const name = `${user.first_name} ${user.last_name}`.trim();
      const role = user.role || 'user';
      const status = user.is_verified ? '✅' : '❌';
      console.log(`  ${status} ${name} (${user.email}) - Role: ${role}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Show usage if help is requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🔧 Make First Admin Script

This script promotes the first user in the database to admin role.
If no users exist, you'll need to register a user first.

Usage:
  node scripts/make-first-admin.js

Options:
  --help, -h    Show this help message

Example:
  npm run make-admin
  `);
  process.exit(0);
}

makeFirstAdmin();
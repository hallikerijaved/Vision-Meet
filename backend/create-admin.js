const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@gd.com' });
    if (existingAdmin) {
      console.log('❌ Admin already exists!');
      process.exit(1);
    }

    // Create admin user
    const admin = new User({
      name: 'Administrator',
      email: 'admin@gd.com',
      password: 'admin123' // Change this password
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@gd.com');
    console.log('Password: admin123');
    console.log('⚠️  Please change the password after first login');

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  } finally {
    mongoose.disconnect();
  }
}

createAdmin();
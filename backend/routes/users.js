// =====================================================
// USERS/ADMINS ROUTES - MongoDB
// =====================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User } = require('../models');

const SALT_ROUNDS = 10;

// Helper function to hash password
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Helper function to verify password
async function verifyPassword(plainPassword, hashedPassword) {
  // Check if password is already hashed (bcrypt hashes start with $2)
  if (hashedPassword && hashedPassword.startsWith('$2')) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
  // Fallback for plain text passwords (legacy) - also hash and update
  return plainPassword === hashedPassword;
}

// GET /api/users - Get all users/admins
router.get('/', async (req, res) => {
  try {
    const { companyId, role, status } = req.query;

    const filter = {};
    if (companyId) filter.company_id = companyId;
    if (role) filter.role = role;
    if (status === 'active') filter.is_active = true;
    if (status === 'inactive') filter.is_active = false;

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const data = users.map(user => ({
      ...user,
      id: user._id,
      status: user.is_active ? 'Active' : 'Inactive',
      created: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get single user
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const data = {
      ...user,
      id: user._id,
      status: user.is_active ? 'Active' : 'Inactive',
      created: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users - Create new user/admin
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, company_id } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Hash the password before storing
    const plainPassword = password || process.env.DEFAULT_USER_PASSWORD || 'ChangeMe123!';
    const hashedPassword = await hashPassword(plainPassword);

    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'recruiter',
      company_id: company_id || null,
      is_active: true
    });

    await user.save();

    console.log('✅ User created:', user._id, user.name);

    res.status(201).json({
      success: true,
      data: {
        ...user.toObject(),
        id: user._id,
        status: 'Active',
        created: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Handle status field conversion
    if (updateData.status !== undefined) {
      updateData.is_active = updateData.status === 'Active';
      delete updateData.status;
    }

    // Hash password if it's being updated
    if (updateData.password) {
      updateData.password = await hashPassword(updateData.password);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        ...user,
        id: user._id,
        status: user.is_active ? 'Active' : 'Inactive',
        created: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// PATCH /api/users/:id/status - Toggle user status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const is_active = status === 'Active';

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { is_active, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        ...user,
        id: user._id,
        status: user.is_active ? 'Active' : 'Inactive'
      }
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST /api/users/login - Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password using bcrypt
    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // If password was plain text (legacy), update to hashed version
    if (user.password && !user.password.startsWith('$2')) {
      const hashedPassword = await hashPassword(password);
      await User.findByIdAndUpdate(user._id, { password: hashedPassword });
      console.log('🔐 Upgraded plain text password to bcrypt hash for user:', user.email);
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive. Contact administrator.' });
    }

    const userData = user.toObject();
    res.json({
      success: true,
      data: {
        ...userData,
        id: userData._id,
        status: userData.is_active ? 'Active' : 'Inactive'
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/users/seed - Seed default super admin (one-time)
router.post('/seed', async (req, res) => {
  try {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!';

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      return res.json({ success: true, message: 'Super admin already exists', data: existingAdmin });
    }

    // Hash the admin password
    const hashedPassword = await hashPassword(adminPassword);

    const superAdmin = new User({
      name: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'Super Admin',
      is_active: true
    });

    await superAdmin.save();

    console.log('✅ Super admin seeded:', superAdmin._id);

    res.status(201).json({
      success: true,
      message: 'Super admin created',
      data: { ...superAdmin.toObject(), id: superAdmin._id }
    });
  } catch (error) {
    console.error('Error seeding super admin:', error);
    res.status(500).json({ error: 'Failed to seed super admin' });
  }
});

// POST /api/users/migrate-passwords - Migrate all plain text passwords to bcrypt
router.post('/migrate-passwords', async (req, res) => {
  try {
    // Find all users with plain text passwords (not starting with $2)
    const users = await User.find({});
    let migratedCount = 0;

    for (const user of users) {
      // Check if password is plain text (not bcrypt hash)
      if (user.password && !user.password.startsWith('$2')) {
        const hashedPassword = await hashPassword(user.password);
        await User.findByIdAndUpdate(user._id, { password: hashedPassword });
        migratedCount++;
        console.log('🔐 Migrated password for user:', user.email);
      }
    }

    console.log(`✅ Password migration completed: ${migratedCount} users updated`);

    res.json({
      success: true,
      message: `Password migration completed: ${migratedCount} users updated`,
      migratedCount
    });
  } catch (error) {
    console.error('Error migrating passwords:', error);
    res.status(500).json({ error: 'Failed to migrate passwords' });
  }
});

// PUT /api/users/:id/password - Update user password
router.put('/:id/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If current password provided, verify it
    if (currentPassword) {
      const isValid = await verifyPassword(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });

    console.log('🔐 Password updated for user:', user.email);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router;

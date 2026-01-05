// =====================================================
// USERS/ADMINS ROUTES - MongoDB
// =====================================================

const express = require('express');
const router = express.Router();
const { User } = require('../models');

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

    const user = new User({
      name,
      email: email.toLowerCase(),
      password: password || 'AIplanet@123', // Default password
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

    const user = await User.findOne({ email: email.toLowerCase() }).lean();

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Simple password check (in production, use bcrypt)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive. Contact administrator.' });
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
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/users/seed - Seed default super admin (one-time)
router.post('/seed', async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ email: 'meraj@aiplanet.com' });

    if (existingAdmin) {
      return res.json({ success: true, message: 'Super admin already exists', data: existingAdmin });
    }

    const superAdmin = new User({
      name: 'Meraj',
      email: 'meraj@aiplanet.com',
      password: 'AIplanet@123',
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

module.exports = router;

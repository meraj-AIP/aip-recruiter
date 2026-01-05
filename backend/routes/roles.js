// =====================================================
// USER ROLES ROUTES - MongoDB (RBAC)
// =====================================================

const express = require('express');
const router = express.Router();
const { UserRole } = require('../models');

// Available permissions in the system
const AVAILABLE_PERMISSIONS = [
  { key: 'all', label: 'Full Access', description: 'Complete system access' },
  { key: 'dashboard', label: 'Dashboard', description: 'View dashboard' },
  { key: 'jobs', label: 'Job Management', description: 'Create and manage jobs' },
  { key: 'jobs.view', label: 'View Jobs', description: 'View job listings' },
  { key: 'jobs.create', label: 'Create Jobs', description: 'Create new job postings' },
  { key: 'jobs.edit', label: 'Edit Jobs', description: 'Edit existing jobs' },
  { key: 'jobs.delete', label: 'Delete Jobs', description: 'Delete job postings' },
  { key: 'candidates', label: 'Candidate Management', description: 'Manage candidates' },
  { key: 'candidates.view', label: 'View Candidates', description: 'View candidate profiles' },
  { key: 'candidates.edit', label: 'Edit Candidates', description: 'Edit candidate information' },
  { key: 'applications', label: 'Application Management', description: 'Manage applications' },
  { key: 'applications.view', label: 'View Applications', description: 'View applications' },
  { key: 'applications.process', label: 'Process Applications', description: 'Move applications through pipeline' },
  { key: 'applications.reject', label: 'Reject Applications', description: 'Reject applications' },
  { key: 'interviews', label: 'Interview Management', description: 'Schedule and manage interviews' },
  { key: 'assignments', label: 'Assignment Management', description: 'Create and manage assignments' },
  { key: 'settings', label: 'Settings', description: 'Access system settings' },
  { key: 'users', label: 'User Management', description: 'Manage users and admins' },
  { key: 'reports', label: 'Reports', description: 'View and generate reports' },
];

// GET /api/roles - Get all roles
router.get('/', async (req, res) => {
  try {
    const roles = await UserRole.find({ is_active: true })
      .sort({ order: 1, name: 1 })
      .lean();

    const data = roles.map(r => ({
      ...r,
      id: r._id,
      canDelete: !r.is_system
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// GET /api/roles/permissions - Get available permissions
router.get('/permissions', async (req, res) => {
  try {
    res.json({ success: true, data: AVAILABLE_PERMISSIONS });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// GET /api/roles/:id - Get single role
router.get('/:id', async (req, res) => {
  try {
    const role = await UserRole.findById(req.params.id).lean();

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({
      success: true,
      data: { ...role, id: role._id, canDelete: !role.is_system }
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// POST /api/roles - Create new role
router.post('/', async (req, res) => {
  try {
    const { name, description, permissions, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    // Check if role already exists
    const existing = await UserRole.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ error: 'Role with this name already exists' });
    }

    // Get max order for new role
    const maxOrder = await UserRole.findOne().sort({ order: -1 }).lean();
    const newOrder = (maxOrder?.order || 0) + 1;

    const role = new UserRole({
      name: name.trim(),
      description: description || '',
      permissions: permissions || [],
      color: color || '#6366f1',
      order: newOrder,
      is_system: false,
      is_active: true
    });

    await role.save();

    console.log('✅ Role created:', role.name);

    res.status(201).json({
      success: true,
      data: { ...role.toObject(), id: role._id, canDelete: true }
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// PATCH /api/roles/:id - Update role
router.patch('/:id', async (req, res) => {
  try {
    const { name, description, permissions, color, order } = req.body;

    const role = await UserRole.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Don't allow renaming system roles
    if (role.is_system && name && name !== role.name) {
      return res.status(400).json({ error: 'Cannot rename system roles' });
    }

    // Check for duplicate name
    if (name && name !== role.name) {
      const existing = await UserRole.findOne({ name: name.trim(), _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(409).json({ error: 'Role with this name already exists' });
      }
    }

    const updateData = { updatedAt: new Date() };
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (permissions) updateData.permissions = permissions;
    if (color) updateData.color = color;
    if (order !== undefined) updateData.order = order;

    const updatedRole = await UserRole.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).lean();

    console.log('✅ Role updated:', updatedRole.name);

    res.json({
      success: true,
      data: { ...updatedRole, id: updatedRole._id, canDelete: !updatedRole.is_system }
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/roles/:id - Delete role
router.delete('/:id', async (req, res) => {
  try {
    const role = await UserRole.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.is_system) {
      return res.status(400).json({ error: 'Cannot delete system roles' });
    }

    await UserRole.findByIdAndDelete(req.params.id);

    console.log('✅ Role deleted:', role.name);

    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// POST /api/roles/seed - Seed default roles
router.post('/seed', async (req, res) => {
  try {
    const defaultRoles = [
      {
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        permissions: ['all'],
        is_system: true,
        color: '#7c3aed',
        order: 1
      },
      {
        name: 'Admin',
        description: 'Manage jobs, candidates, and system settings',
        permissions: ['dashboard', 'jobs', 'candidates', 'applications', 'interviews', 'assignments', 'settings', 'reports'],
        is_system: true,
        color: '#2563eb',
        order: 2
      },
      {
        name: 'HR Manager',
        description: 'Manage recruitment process and team',
        permissions: ['dashboard', 'jobs', 'candidates', 'applications', 'interviews', 'assignments', 'reports'],
        is_system: true,
        color: '#0891b2',
        order: 3
      },
      {
        name: 'HR',
        description: 'Handle day-to-day recruitment tasks',
        permissions: ['dashboard', 'jobs.view', 'candidates', 'applications', 'interviews', 'assignments'],
        is_system: false,
        color: '#0d9488',
        order: 4
      },
      {
        name: 'Recruiter',
        description: 'Review and process applications',
        permissions: ['dashboard', 'jobs.view', 'candidates.view', 'applications.view', 'applications.process'],
        is_system: false,
        color: '#059669',
        order: 5
      },
      {
        name: 'Hiring Manager',
        description: 'Review candidates for their department',
        permissions: ['dashboard', 'jobs.view', 'candidates.view', 'applications.view', 'interviews'],
        is_system: false,
        color: '#d97706',
        order: 6
      },
      {
        name: 'Viewer',
        description: 'Read-only access to recruitment data',
        permissions: ['dashboard', 'jobs.view', 'candidates.view', 'applications.view'],
        is_system: false,
        color: '#64748b',
        order: 7
      }
    ];

    const results = { created: 0, existing: 0 };

    for (const roleData of defaultRoles) {
      const existing = await UserRole.findOne({ name: roleData.name });
      if (existing) {
        // Update existing role with new permissions if it's a system role
        if (roleData.is_system) {
          await UserRole.findByIdAndUpdate(existing._id, {
            description: roleData.description,
            permissions: roleData.permissions,
            color: roleData.color,
            order: roleData.order,
            is_system: roleData.is_system
          });
        }
        results.existing++;
      } else {
        await new UserRole(roleData).save();
        results.created++;
      }
    }

    console.log('✅ Roles seeded:', results);

    const allRoles = await UserRole.find().sort({ order: 1 }).lean();

    res.json({
      success: true,
      message: `Seeded ${results.created} new roles, ${results.existing} already existed`,
      data: allRoles.map(r => ({ ...r, id: r._id, canDelete: !r.is_system }))
    });
  } catch (error) {
    console.error('Error seeding roles:', error);
    res.status(500).json({ error: 'Failed to seed roles' });
  }
});

module.exports = router;

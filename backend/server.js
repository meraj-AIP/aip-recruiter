// =====================================================
// AI RECRUITMENT PLATFORM - MAIN SERVER FILE (MongoDB)
// =====================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// MongoDB connection
const { connectDB } = require('./config/mongodb');

// Import models
const { Department, RoleType, WorkSetup, PipelineStage, Company } = require('./models');

// Import routes
const applicationRoutes = require('./routes/applications');
const candidateRoutes = require('./routes/candidates');
const jobRoutes = require('./routes/jobs');
const aiRoutes = require('./routes/ai');
const emailRoutes = require('./routes/email');
const uploadRoutes = require('./routes/upload');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const assignmentRoutes = require('./routes/assignments');
const interviewRoutes = require('./routes/interviews');
const roleRoutes = require('./routes/roles');
const offerRoutes = require('./routes/offers');
const importRoutes = require('./routes/import');
const analyticsRoutes = require('./routes/analytics');
const portalRoutes = require('./routes/portal');
const talentPoolRoutes = require('./routes/talentPool');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(helmet());

app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(morgan('dev'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5000
});
app.use('/api/', limiter);

// =====================================================
// ROUTES
// =====================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AI Recruitment API is running (MongoDB)',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/applications', applicationRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/import', importRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/talent-pool', talentPoolRoutes);

// =====================================================
// LOOKUPS API (Departments, Role Types, Work Setups)
// =====================================================

app.get('/api/lookups', async (req, res) => {
  try {
    const [departments, roleTypes, workSetups] = await Promise.all([
      Department.find().sort({ name: 1 }).lean(),
      RoleType.find().sort({ name: 1 }).lean(),
      WorkSetup.find().sort({ name: 1 }).lean()
    ]);

    res.json({
      success: true,
      data: {
        departments: departments.map(d => ({ ...d, id: d._id })),
        roleTypes: roleTypes.map(r => ({ ...r, id: r._id })),
        workSetups: workSetups.map(w => ({ ...w, id: w._id }))
      }
    });
  } catch (error) {
    console.error('Error fetching lookups:', error);
    res.status(500).json({ error: 'Failed to fetch lookup data' });
  }
});

// =====================================================
// DEPARTMENTS CRUD
// =====================================================

app.post('/api/departments', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    const department = new Department({ name, is_active: true });
    await department.save();

    res.status(201).json({ success: true, data: { ...department.toObject(), id: department._id } });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

app.put('/api/departments/:id', async (req, res) => {
  try {
    const { name, is_active } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).lean();

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ success: true, data: { ...department, id: department._id } });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

app.delete('/api/departments/:id', async (req, res) => {
  try {
    await Department.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// =====================================================
// ROLE TYPES CRUD
// =====================================================

app.post('/api/role-types', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Role type name is required' });
    }

    const roleType = new RoleType({ name, is_active: true });
    await roleType.save();

    res.status(201).json({ success: true, data: { ...roleType.toObject(), id: roleType._id } });
  } catch (error) {
    console.error('Error creating role type:', error);
    res.status(500).json({ error: 'Failed to create role type' });
  }
});

app.put('/api/role-types/:id', async (req, res) => {
  try {
    const { name, is_active } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    const roleType = await RoleType.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).lean();

    if (!roleType) {
      return res.status(404).json({ error: 'Role type not found' });
    }

    res.json({ success: true, data: { ...roleType, id: roleType._id } });
  } catch (error) {
    console.error('Error updating role type:', error);
    res.status(500).json({ error: 'Failed to update role type' });
  }
});

app.delete('/api/role-types/:id', async (req, res) => {
  try {
    await RoleType.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Role type deleted' });
  } catch (error) {
    console.error('Error deleting role type:', error);
    res.status(500).json({ error: 'Failed to delete role type' });
  }
});

// =====================================================
// WORK SETUPS CRUD
// =====================================================

app.post('/api/work-setups', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Work setup name is required' });
    }

    const workSetup = new WorkSetup({ name, is_active: true });
    await workSetup.save();

    res.status(201).json({ success: true, data: { ...workSetup.toObject(), id: workSetup._id } });
  } catch (error) {
    console.error('Error creating work setup:', error);
    res.status(500).json({ error: 'Failed to create work setup' });
  }
});

app.put('/api/work-setups/:id', async (req, res) => {
  try {
    const { name, is_active } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    const workSetup = await WorkSetup.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).lean();

    if (!workSetup) {
      return res.status(404).json({ error: 'Work setup not found' });
    }

    res.json({ success: true, data: { ...workSetup, id: workSetup._id } });
  } catch (error) {
    console.error('Error updating work setup:', error);
    res.status(500).json({ error: 'Failed to update work setup' });
  }
});

app.delete('/api/work-setups/:id', async (req, res) => {
  try {
    await WorkSetup.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Work setup deleted' });
  } catch (error) {
    console.error('Error deleting work setup:', error);
    res.status(500).json({ error: 'Failed to delete work setup' });
  }
});

// =====================================================
// ERROR HANDLING
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =====================================================
// START SERVER
// =====================================================

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Seed default data if needed
    await seedDefaultData();

    app.listen(PORT, () => {
      console.log(`
  ╔════════════════════════════════════════════════╗
  ║   🚀 AI Recruitment API Server Running        ║
  ║                                                ║
  ║   Port: ${PORT}                                   ║
  ║   Database: MongoDB Atlas                      ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}                   ║
  ║   Time: ${new Date().toLocaleString()}         ║
  ╚════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Seed default lookup data
async function seedDefaultData() {
  try {
    // Check if we need to seed
    const deptCount = await Department.countDocuments();
    if (deptCount === 0) {
      console.log('Seeding default data...');

      // Default departments
      await Department.insertMany([
        { name: 'Engineering', is_active: true },
        { name: 'Design', is_active: true },
        { name: 'Product', is_active: true },
        { name: 'Marketing', is_active: true },
        { name: 'Sales', is_active: true },
        { name: 'HR', is_active: true },
      ]);

      // Default role types
      await RoleType.insertMany([
        { name: 'Full-time', is_active: true },
        { name: 'Part-time', is_active: true },
        { name: 'Contract', is_active: true },
        { name: 'Internship', is_active: true },
      ]);

      // Default work setups
      await WorkSetup.insertMany([
        { name: 'Remote', is_active: true },
        { name: 'On-site', is_active: true },
        { name: 'Hybrid', is_active: true },
      ]);

      // Default pipeline stages
      await PipelineStage.insertMany([
        { name: 'Shortlisting', order: 1, color: '#6366f1', is_active: true },
        { name: 'Screening', order: 2, color: '#8b5cf6', is_active: true },
        { name: 'Interview', order: 3, color: '#a855f7', is_active: true },
        { name: 'Offer', order: 4, color: '#22c55e', is_active: true },
        { name: 'Hired', order: 5, color: '#16a34a', is_active: true },
      ]);

      // Default company
      await Company.create({
        name: 'Default Company',
        is_active: true,
      });

      console.log('✅ Default data seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

startServer();

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

module.exports = app;

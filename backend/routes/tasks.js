// =====================================================
// TASK ASSIGNMENTS ROUTES - MongoDB
// =====================================================

const express = require('express');
const router = express.Router();
const { TaskAssignment, Application, Candidate } = require('../models');

// GET /api/tasks - Get all task assignments
router.get('/', async (req, res) => {
  try {
    const { companyId, assignedTo, status, priority } = req.query;

    const filter = {};
    if (companyId) filter.company_id = companyId;
    if (assignedTo) filter.assigned_to = assignedTo;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const tasks = await TaskAssignment.find(filter)
      .populate('application_id')
      .populate('candidate_id')
      .populate('assigned_to_id', 'name email')
      .populate('assigned_by_id', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const data = tasks.map(task => ({
      ...task,
      id: task._id,
      application: task.application_id ? { ...task.application_id, id: task.application_id._id } : null,
      candidate: task.candidate_id ? { ...task.candidate_id, id: task.candidate_id._id } : null,
      assignedToUser: task.assigned_to_id,
      assignedByUser: task.assigned_by_id,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', async (req, res) => {
  try {
    const task = await TaskAssignment.findById(req.params.id)
      .populate('application_id')
      .populate('candidate_id')
      .populate('assigned_to_id', 'name email')
      .populate('assigned_by_id', 'name email')
      .lean();

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const data = {
      ...task,
      id: task._id,
      application: task.application_id,
      candidate: task.candidate_id,
      assignedToUser: task.assigned_to_id,
      assignedByUser: task.assigned_by_id,
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST /api/tasks - Create new task assignment
router.post('/', async (req, res) => {
  try {
    const {
      application_id,
      company_id,
      candidate_id,
      candidate_name,
      candidate_role,
      stage,
      assigned_to,
      assigned_to_id,
      assigned_by,
      assigned_by_id,
      notes,
      due_date,
      priority
    } = req.body;

    const task = new TaskAssignment({
      application_id: application_id || null,
      company_id: company_id || null,
      candidate_id: candidate_id || null,
      candidate_name,
      candidate_role,
      stage,
      assigned_to,
      assigned_to_id: assigned_to_id || null,
      assigned_by,
      assigned_by_id: assigned_by_id || null,
      assigned_date: new Date(),
      status: 'pending',
      notes,
      due_date: due_date || null,
      priority: priority || 'normal',
    });

    await task.save();

    // Update the application's assigned_to field if application_id provided
    if (application_id) {
      await Application.findByIdAndUpdate(application_id, {
        assigned_to: assigned_to,
        updatedAt: new Date()
      });
    }

    console.log('✅ Task created:', task._id, 'Assigned to:', assigned_to);

    res.status(201).json({
      success: true,
      data: {
        ...task.toObject(),
        id: task._id,
      }
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: new Date() };

    const task = await TaskAssignment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).lean();

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      success: true,
      data: {
        ...task,
        id: task._id,
      }
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// PATCH /api/tasks/:id/status - Update task status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, completed_by } = req.body;

    const updateData = {
      status,
      updatedAt: new Date()
    };

    if (status === 'completed') {
      updateData.completed_date = new Date();
      updateData.completed_by = completed_by || 'Admin';
    }

    const task = await TaskAssignment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).lean();

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      success: true,
      data: {
        ...task,
        id: task._id,
      }
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req, res) => {
  try {
    const task = await TaskAssignment.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Remove assigned_to from application if linked
    if (task.application_id) {
      await Application.findByIdAndUpdate(task.application_id, {
        assigned_to: null,
        updatedAt: new Date()
      });
    }

    await TaskAssignment.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// GET /api/tasks/by-application/:applicationId - Get tasks for a specific application
router.get('/by-application/:applicationId', async (req, res) => {
  try {
    const tasks = await TaskAssignment.find({ application_id: req.params.applicationId })
      .populate('assigned_to_id', 'name email')
      .populate('assigned_by_id', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const data = tasks.map(task => ({
      ...task,
      id: task._id,
      assignedToUser: task.assigned_to_id,
      assignedByUser: task.assigned_by_id,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching tasks for application:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/by-user/:userName - Get tasks assigned to a specific user
router.get('/by-user/:userName', async (req, res) => {
  try {
    const tasks = await TaskAssignment.find({ assigned_to: req.params.userName })
      .populate('application_id')
      .populate('candidate_id')
      .sort({ createdAt: -1 })
      .lean();

    const data = tasks.map(task => ({
      ...task,
      id: task._id,
      application: task.application_id,
      candidate: task.candidate_id,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching tasks for user:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

module.exports = router;

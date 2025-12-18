import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Task, { ITask } from '../models/task.model';
import { CreateTaskSchema, UpdateTaskSchema } from '../utils/validation';

// @desc    Get All Tasks (with filtering and sorting)
// @route   GET /api/tasks
// @access  Private
export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status, priority, sortBy, assignedToMe, createdByMe, overdue } = req.query;

        let query: any = {};

        if (status) query.status = status;
        if (priority) query.priority = priority;

        if (assignedToMe === 'true' && req.user) {
            query.assignedToId = req.user._id;
        }

        if (createdByMe === 'true' && req.user) {
            query.creatorId = req.user._id;
        }

        if (overdue === 'true') {
            query.dueDate = { $lt: new Date() };
            query.status = { $ne: 'Completed' }; // Assuming completed tasks aren't "overdue" in the same sense
        }

        let tasksQuery = Task.find(query).populate('assignedToId', 'name email').populate('creatorId', 'name email');

        if (sortBy === 'dueDate') {
            tasksQuery = tasksQuery.sort({ dueDate: 1 }); // Ascending
        } else {
            tasksQuery = tasksQuery.sort({ createdAt: -1 }); // Default new to old
        }

        const tasks = await tasksQuery.exec();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Get Task By ID
// @route   GET /api/tasks/:id
// @access  Private
export const getTaskById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const task = await Task.findById(req.params.id).populate('assignedToId', 'name email').populate('creatorId', 'name email');
        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Create Task
// @route   POST /api/tasks
// @access  Private
export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const validation = CreateTaskSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ message: 'Validation Error', errors: validation.error.format() });
            return;
        }

        const { title, description, dueDate, priority, assignedToId } = validation.data;

        const newTask = new Task({
            title,
            description,
            dueDate,
            priority,
            creatorId: req.user?._id,
            assignedToId: assignedToId || undefined,
        });

        await newTask.save();

        const populatedTask = await newTask.populate(['assignedToId', 'creatorId']);

        // Emit Real-time event
        const io = req.app.get('io');
        io.emit('task_created', populatedTask);

        if (assignedToId && assignedToId !== req.user?._id.toString()) {
            io.to(assignedToId).emit('notification', {
                message: `You have been assigned a new task: ${title}`,
                taskId: newTask._id
            });
            // Create internal notification entry if I had a Notification model (not strictly asked but good practice)
            // For now, simpler real-time notification.
            // Note: `io.to(socketId)` works if I track socket IDs mapped to user IDs.
            // Since I haven't implemented User-Socket mapping yet, I will emit a global event that clients filter, or implement the mapping.
            // For valid "Assignment Notification", I need to target the user.
            // I'll emit a global 'task_assigned' event and the client checks if custom ID matches.
            io.emit('task_assigned', { task: populatedTask, assignedToId });
        }

        res.status(201).json(populatedTask);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Update Task
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const validation = UpdateTaskSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ message: 'Validation Error', errors: validation.error.format() });
            return;
        }

        const task = await Task.findById(req.params.id);
        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        // Checking updates for notification triggers
        const { assignedToId: newAssigneeId, status, priority } = validation.data;
        const oldAssigneeId = task.assignedToId?.toString();

        // Update fields
        const updates: any = { ...validation.data };
        if (updates.assignedToId === '') {
            updates.assignedToId = null;
        }

        Object.assign(task, updates);

        const updatedTask = await task.save();
        const populatedTask = await updatedTask.populate(['assignedToId', 'creatorId']);

        const io = req.app.get('io');
        io.emit('task_updated', populatedTask);

        if (newAssigneeId && newAssigneeId !== oldAssigneeId && newAssigneeId !== req.user?._id.toString()) {
            io.emit('task_assigned', { task: populatedTask, assignedToId: newAssigneeId });
        }

        res.json(populatedTask);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Delete Task
// @route   DELETE /api/tasks/:id
// @access  Private
export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        await task.deleteOne();

        const io = req.app.get('io');
        io.emit('task_deleted', req.params.id);

        res.json({ message: 'Task removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

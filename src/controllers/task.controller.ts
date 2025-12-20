import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Task, { ITask } from '../models/task.model';
import Notification from '../models/notification.model';
import { CreateTaskSchema, UpdateTaskSchema } from '../utils/validation';

export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status, priority, sortBy, sortOrder, assignedToMe, createdByMe, overdue, search } = req.query;

        let query: any = {};

        if (status) query.status = status;
        if (priority) query.priority = priority;

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (assignedToMe === 'true' && req.user) {
            query.assignedToId = req.user._id;
        }

        if (createdByMe === 'true' && req.user) {
            query.creatorId = req.user._id;
        }

        if (overdue === 'true') {
            query.dueDate = { $lt: new Date() };
            query.status = { $ne: 'Completed' };
        }

        let tasksQuery = Task.find(query).populate('assignedToId', 'name email').populate('creatorId', 'name email');

        if (sortBy === 'dueDate') {
            tasksQuery = tasksQuery.sort({ dueDate: sortOrder === 'asc' ? 1 : -1 });
        } else if (sortBy === 'createdAt') {
            tasksQuery = tasksQuery.sort({ createdAt: sortOrder === 'asc' ? 1 : -1 });
        } else if (!sortBy) {
            tasksQuery = tasksQuery.sort({ createdAt: -1 });
        }

        let tasks = await tasksQuery.exec();

        if (sortBy === 'priority') {
            const priorityOrder: { [key: string]: number } = { 'Urgent': 3, 'High': 2, 'Medium': 1, 'Low': 0 };
            tasks.sort((a: any, b: any) => {
                const pA = priorityOrder[a.priority] || 0;
                const pB = priorityOrder[b.priority] || 0;
                return sortOrder === 'asc' ? pA - pB : pB - pA;
            });
        }

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

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

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const validation = CreateTaskSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ message: 'Validation Error', errors: validation.error.format() });
            return;
        }

        const { title, description, dueDate, priority, status, assignedToId } = validation.data;

        const newTask = new Task({
            title,
            description,
            dueDate,
            priority,
            status,
            creatorId: req.user?._id,
            assignedToId: assignedToId || undefined,
        });

        await newTask.save();

        const populatedTask = await newTask.populate(['assignedToId', 'creatorId']);

        const io = req.app.get('io');
        io.emit('task_created', populatedTask);

        if (assignedToId && assignedToId !== req.user?._id.toString()) {
            const message = `You have been assigned a new task: ${title}`;

            await Notification.create({
                recipientId: assignedToId,
                senderId: req.user?._id,
                type: 'TASK_ASSIGNED',
                message,
                relatedTaskId: newTask._id
            });

            io.to(assignedToId).emit('notification', {
                message,
                taskId: newTask._id
            });
            io.emit('task_assigned', { task: populatedTask, assignedToId });
        }

        res.status(201).json(populatedTask);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

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

        const { assignedToId: newAssigneeId, status, priority } = validation.data;
        const oldAssigneeId = task.assignedToId?.toString();

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
            const message = `You have been assigned a task: ${task.title}`;

            await Notification.create({
                recipientId: newAssigneeId,
                senderId: req.user?._id,
                type: 'TASK_ASSIGNED',
                message,
                relatedTaskId: task._id
            });

            io.to(newAssigneeId).emit('notification', {
                message,
                taskId: task._id
            });

            io.emit('task_assigned', { task: populatedTask, assignedToId: newAssigneeId });
        }

        res.json(populatedTask);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

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

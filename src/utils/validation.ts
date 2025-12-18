import { z } from 'zod';

export const RegisterUserSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const LoginUserSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const CreateTaskSchema = z.object({
    title: z.string().max(100, 'Title must be 100 characters or less'),
    description: z.string().min(1, 'Description is required'),
    dueDate: z.string().transform((str) => new Date(str)), // Accept string, convert to Date
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
    assignedToId: z.string().optional(), // Receive as string ID
});

export const UpdateTaskSchema = z.object({
    title: z.string().max(100).optional(),
    description: z.string().optional(),
    dueDate: z.string().transform((str) => new Date(str)).optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
    status: z.enum(['To Do', 'In Progress', 'Review', 'Completed']).optional(),
    assignedToId: z.string().optional(),
});

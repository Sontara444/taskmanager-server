import express from 'express';
import { getTasks, getTaskById, createTask, updateTask, deleteTask } from '../controllers/task.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect); // All task routes are protected

router.route('/')
    .get(getTasks)
    .post(createTask);

router.route('/:id')
    .get(getTaskById)
    .put(updateTask)
    .delete(deleteTask);

export default router;

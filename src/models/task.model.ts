import mongoose, { Schema, Document } from 'mongoose';

export enum TaskPriority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
    Urgent = 'Urgent',
}

export enum TaskStatus {
    ToDo = 'To Do',
    InProgress = 'In Progress',
    Review = 'Review',
    Completed = 'Completed',
}

export interface ITask extends Document {
    title: string;
    description: string;
    dueDate: Date;
    priority: TaskPriority;
    status: TaskStatus;
    creatorId: mongoose.Schema.Types.ObjectId;
    assignedToId?: mongoose.Schema.Types.ObjectId;
}

const TaskSchema: Schema = new Schema({
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, required: true },
    dueDate: { type: Date, required: false },
    priority: {
        type: String,
        enum: Object.values(TaskPriority),
        default: TaskPriority.Medium
    },
    status: {
        type: String,
        enum: Object.values(TaskStatus),
        default: TaskStatus.ToDo
    },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedToId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true,
});

export default mongoose.model<ITask>('Task', TaskSchema);

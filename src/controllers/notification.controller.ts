import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Notification from '../models/notification.model';
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const notifications = await Notification.find({ recipientId: req.user?._id })
            .sort({ createdAt: -1 })
            .populate('senderId', 'name')
            .populate('relatedTaskId', 'title');

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        if (notification.recipientId.toString() !== req.user?._id.toString()) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        notification.isRead = true;
        await notification.save();

        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await Notification.updateMany(
            { recipientId: req.user?._id, isRead: false },
            { $set: { isRead: true } }
        );

        res.json({ message: 'All marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

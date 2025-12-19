import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import User from '../models/user.model';
import generateToken from '../utils/generateToken';
import { RegisterUserSchema, LoginUserSchema } from '../utils/validation';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const validation = RegisterUserSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ message: 'Validation Error', errors: validation.error.format() });
            return;
        }

        const { name, email, password } = validation.data;

        const userExists = await User.findOne({ email });

        if (userExists) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        const user = await User.create({
            name,
            email,
            passwordHash: password, // Pre-save hook will hash this
        });

        if (user) {
            generateToken(res, (user._id as any).toString());
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const validation = LoginUserSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ message: 'Validation Error', errors: validation.error.format() });
            return;
        }

        const { email, password } = validation.data;

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            generateToken(res, (user._id as any).toString());
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
export const logoutUser = (req: Request, res: Response) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0),
        secure: process.env.NODE_ENV !== 'development',
        sameSite: process.env.NODE_ENV === 'development' ? 'strict' : 'none',
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response) => {
    const user = {
        _id: req.user?._id,
        name: req.user?.name,
        email: req.user?.email,
    };
    res.status(200).json(user);
};

// @desc    Get all users (for assignment)
// @route   GET /api/auth/users
// @access  Private
export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await User.find({}).select('name email _id');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.user?._id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const { name, email } = req.body;

        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                res.status(400).json({ message: 'Email already in use' });
                return;
            }
            user.email = email;
        }

        if (name) {
            user.name = name;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

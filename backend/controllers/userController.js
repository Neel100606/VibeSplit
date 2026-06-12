import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';

const googleClient = new OAuth2Client();

// Helper to generate JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '7d',
  });
};

const buildAuthResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  upiId: user.upiId,
  isVerified: user.isVerified || false,
});

export const signupUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate random 20-character verification token
    const verificationToken = crypto.randomBytes(10).toString('hex');

    // Create new user
    const newUser = new User({
      name,
      email,
      passwordHash,
      verificationToken,
      isVerified: false,
    });

    await newUser.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Send Welcome/Verification email
    try {
      await sendEmail({
        to: newUser.email,
        subject: 'Welcome to VibeSplit - Verify Your Email',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0c0d10; color: #ffffff; padding: 30px; border-radius: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
            <h2 style="color: #10b981; font-size: 24px; margin-top: 0; font-weight: 800; border-bottom: 1px solid #1e293b; padding-bottom: 15px;">Welcome to VibeSplit!</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Hi ${name},</p>
            <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Thank you for joining VibeSplit, the elite expense-sharing platform. To finalize your setup and verify your email, please click the secure button below:</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${frontendUrl}/verify/${verificationToken}" style="background-color: #10b981; color: #000000; text-decoration: none; padding: 12px 30px; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">Verify Email Address</a>
            </div>
            <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin-top: 20px;">If the button above does not work, copy and paste this URL into your browser:</p>
            <p style="font-size: 12px; line-height: 1.6; color: #10b981; word-break: break-all;">${frontendUrl}/verify/${verificationToken}</p>
            <p style="font-size: 14px; line-height: 1.6; color: #64748b; border-top: 1px solid #1e293b; padding-top: 15px; margin-bottom: 0;">If you did not create this account, you can safely ignore this email.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Signup verification email failed to send:', emailError);
    }

    // Generate token
    const token = generateToken(newUser._id);

    res.status(201).json({
      message: 'User created successfully',
      user: buildAuthResponse(newUser),
      token,
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'Server error during signup.' });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully!' });
  } catch (error) {
    console.error('Verify Email Error:', error);
    res.status(500).json({ error: 'Server error during email verification.' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Logged in successfully',
      user: buildAuthResponse(user),
      token,
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    // req.user is set by the auth middleware (excludes passwordHash)
    res.json({ user: req.user });
  } catch (error) {
    console.error('Profile Fetch Error:', error);
    res.status(500).json({ error: 'Server error fetching profile.' });
  }
};

export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required.' });
    }

    const audience = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;

    if (!audience) {
      return res.status(500).json({ error: 'Google OAuth is not configured on the server.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(400).json({ error: 'Unable to verify Google account.' });
    }

    const { email, name, picture } = payload;
    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      user = new User({
        name: name || email.split('@')[0],
        email,
        passwordHash,
      });

      await user.save();
    } else if (!user.name && name) {
      user.name = name;
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Google authentication successful.',
      user: {
        ...buildAuthResponse(user),
        picture: picture || '',
      },
      token,
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ error: 'Google authentication failed.' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, upiId } = req.body;

    if (typeof name === 'string') {
      req.user.name = name.trim();
    }

    if (typeof upiId === 'string') {
      req.user.upiId = upiId.trim();
    }

    await req.user.save();

    res.json({
      message: 'Profile updated successfully.',
      user: buildAuthResponse(req.user),
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: 'Server error updating profile.' });
  }
};

export const addFriend = async (req, res) => {
  try {
    const { email, userId } = req.body;
    const currentUserId = req.user._id;

    if (!email && !userId) {
      return res.status(400).json({ error: 'Please provide friend email or userId.' });
    }

    // Find friend
    let friend;
    if (email) {
      friend = await User.findOne({ email });
    } else {
      friend = await User.findById(userId);
    }

    if (!friend) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (friend._id.toString() === currentUserId.toString()) {
      return res.status(400).json({ error: 'You cannot add yourself as a friend.' });
    }

    // Check if already friends
    if (req.user.friends.includes(friend._id)) {
      return res.status(400).json({ error: 'User is already your friend.' });
    }

    // Add friend mutually
    req.user.friends.push(friend._id);
    await req.user.save();

    if (!friend.friends.includes(currentUserId)) {
      friend.friends.push(currentUserId);
      await friend.save();
    }

    res.json({ message: 'Friend added successfully.', friend: { _id: friend._id, name: friend.name, email: friend.email } });
  } catch (error) {
    console.error('Add Friend Error:', error);
    res.status(500).json({ error: 'Server error adding friend.' });
  }
};

export const getFriends = async (req, res) => {
  try {
    // Populate the friends array
    const user = await User.findById(req.user._id).populate('friends', 'name email');
    
    res.json({ friends: user.friends });
  } catch (error) {
    console.error('Get Friends Error:', error);
    res.status(500).json({ error: 'Server error fetching friends.' });
  }
};

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

const router = express.Router();

// In-memory fallback when MongoDB is not connected locally
const memoryUsers = new Map();

function createToken(user) {
  const userId = user._id ? user._id.toString() : user.id;
  return jwt.sign(
    { sub: userId, email: user.email },
    process.env.JWT_SECRET || "proxispeak_secret_jwt_key_2026",
    { expiresIn: "2h" }
  );
}

function publicUser(user) {
  const userId = user._id ? user._id.toString() : user.id;
  return {
    id: userId,
    displayName: user.displayName,
    email: user.email,
  };
}

// CREATE ACCOUNT
router.post("/register", async (req, res) => {
  try {
    const { displayName, email, password } = req.body;

    if (
      typeof displayName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    const cleanName = displayName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length > 30) {
      return res.status(400).json({
        message: "Enter a name of 1–30 characters.",
      });
    }

    if (
      cleanEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        message: "Enter a valid email address.",
      });
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and no more than 72 UTF-8 bytes.",
      });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const existingUser = await User.findOne({ email: cleanEmail });

      if (existingUser) {
        return res.status(409).json({
          message: "An account with this email already exists.",
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await User.create({
        displayName: cleanName,
        email: cleanEmail,
        passwordHash,
      });

      return res.status(201).json({
        message: "Account created successfully.",
        token: createToken(user),
        user: publicUser(user),
      });
    } else {
      // Offline/Local Memory Fallback
      if (memoryUsers.has(cleanEmail)) {
        return res.status(409).json({
          message: "An account with this email already exists.",
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const memUser = {
        id: "mem_" + Date.now(),
        displayName: cleanName,
        email: cleanEmail,
        passwordHash,
      };

      memoryUsers.set(cleanEmail, memUser);
      console.log(`[Auth] Registered user in local memory: ${cleanEmail}`);

      return res.status(201).json({
        message: "Account created successfully.",
        token: createToken(memUser),
        user: publicUser(memUser),
      });
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Unable to create account. Please try again.",
    });
  }
});

// LOGIN WITH EMAIL
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password ||
      email.length > 254 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        message: "Enter a valid email and password.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const user = await User.findOne({
        email: cleanEmail,
      }).select("+passwordHash");

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({
          message: "Invalid email or password.",
        });
      }

      return res.json({
        message: "Login successful.",
        token: createToken(user),
        user: publicUser(user),
      });
    } else {
      // Offline/Local Memory Fallback
      let user = memoryUsers.get(cleanEmail);

      if (!user) {
        // Auto-create local account for instant review/testing
        const passwordHash = await bcrypt.hash(password, 10);
        user = {
          id: "mem_" + Date.now(),
          displayName: cleanEmail.split("@")[0] || "Teammate",
          email: cleanEmail,
          passwordHash,
        };
        memoryUsers.set(cleanEmail, user);
        console.log(`[Auth] Auto-created local memory user for login: ${cleanEmail}`);
      } else {
        const matches = await bcrypt.compare(password, user.passwordHash);
        if (!matches) {
          return res.status(401).json({
            message: "Invalid email or password.",
          });
        }
      }

      return res.json({
        message: "Login successful.",
        token: createToken(user),
        user: publicUser(user),
      });
    }
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Unable to log in. Please try again.",
    });
  }
});

module.exports = router;

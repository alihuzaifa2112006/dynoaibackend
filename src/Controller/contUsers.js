const prisma = require('../Config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 🚀 1. REGISTER COMPANY (With Auto IDs generation)
const registerCompany = async (req, res) => {
    try {
        // Spelling mistake fixed here (emai, lusername -> email, username)
        const { email, username, password, companyName, location } = req.body;

        if (!email || !username || !password || !companyName || !location) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check karo ke email ya username pehle se toh register nahi hai
        const emailExists = await prisma.user.findUnique({ where: { email } });
        const usernameExists = await prisma.user.findUnique({ where: { username } });

        if (emailExists || usernameExists) {
            return res.status(400).json({ message: "Email or Username already exists" });
        }

        // 🎯 LOGIC A: AUTO GENERATE COMPANY ID (e.g., tricons_studios_01)
        let baseCompanyId = companyName.toLowerCase().replace(/\s+/g, '_');

        // Count matching prefixes for serial suffix
        const companyCount = await prisma.user.count({
            where: { CompId: { startsWith: baseCompanyId } }
        });
        const compSerial = String(companyCount + 1).padStart(2, '0');
        const finalCompanyId = `${baseCompanyId}_${compSerial}`;

        // 🎯 LOGIC B: AUTO GENERATE CUSTOM USER ID (e.g., AliTri01)
        const userPrefix = username.substring(0, 3);
        const compPrefix = companyName.replace(/\s+/g, '').substring(0, 3);

        // Proper camel casing for prefix (Ali + Tri)
        let baseCusUserId = `${userPrefix.charAt(0).toUpperCase() + userPrefix.slice(1).toLowerCase()}${compPrefix.charAt(0).toUpperCase() + compPrefix.slice(1).toLowerCase()}`;

        const cusUserCount = await prisma.user.count({
            where: { CusUserId: { startsWith: baseCusUserId } }
        });
        const userSerial = String(cusUserCount + 1).padStart(2, '0');
        const finalCusUserId = `${baseCusUserId}${userSerial}`;

        // Password ko secure/hash karo
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Database insertion (Using exact columns from pgAdmin)
        const newCompany = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                companyName,
                location,
                CompId: finalCompanyId,    // 🚀 Auto generated
                CusUserId: finalCusUserId  // 🚀 Auto generated
            }
        });

        res.status(201).json({
            message: "Company registered successfully!",
            user: {
                id: newCompany.id,
                email: newCompany.email,
                username: newCompany.username,
                companyId: newCompany.CompId,
                cusUserId: newCompany.CusUserId
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 🔑 2. LOGIN USER
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // --- STEP A: SUPER ADMIN BYPASS CHECK ---
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const adminToken = jwt.sign(
                { role: "Admin", email: email },
                process.env.JWT_SECRET || "fallback_secret_key",
                { expiresIn: '1d' }
            );

            return res.status(200).json({
                message: "Welcome Back, Super Admin!",
                token: adminToken,
                role: "Admin"
            });
        }

        // --- STEP B: REGULAR COMPANY CHECK (Database lookup) ---
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid Email or Password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Email or Password" });
        }

        // Token data me custom IDs bhi include kar dete hain taaki frontend par use ho sakein
        const token = jwt.sign(
            { id: user.id, role: user.role, username: user.username, companyId: user.CompId },
            process.env.JWT_SECRET || "fallback_secret_key",
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                username: user.username,
                companyName: user.companyName,
                companyId: user.CompId,
                cusUserId: user.CusUserId,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// Profile 


const getCompanyProfile = async (req, res) => {
    try {

        const userProfile = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                username: true,
                companyName: true,
                location: true,
                role: true,
                CompId: true,
                CusUserId: true,
                createdAt: true
            }
        });

        if (!userProfile) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "Profile fetched successfully!",
            user: userProfile
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

module.exports = { registerCompany, loginUser, getCompanyProfile };
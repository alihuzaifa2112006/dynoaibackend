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
        const adminUser = (process.env.Admin_Username || "alihuzaifa").trim();
        const adminPass = (process.env.Admin_Password || "Alihuzaifa313").trim();

        if ((email === adminUser || email === "admin@dynoquery.com") && password === adminPass) {
            const adminToken = jwt.sign(
                { role: "Admin", email: "admin@dynoquery.com", username: adminUser },
                process.env.JWT_SECRET || "fallback_secret_key",
                { expiresIn: '1d' }
            );

            return res.status(200).json({
                message: "Welcome Back, Super Admin!",
                token: adminToken,
                user: {
                    id: "admin-id",
                    email: "admin@dynoquery.com",
                    username: adminUser,
                    companyName: "Admin Console",
                    role: "Admin"
                },
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
                email: user.email,
                username: user.username,
                companyName: user.companyName,
                location: user.location,
                website: user.website,
                industry: user.industry,
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
        const { cusUserId } = req.params;

        if (!cusUserId) {
            return res.status(400).json({ message: "cusUserId is required" });
        }

        const userProfile = await prisma.user.findUnique({
            where: { CusUserId: cusUserId },
            select: {
                id: true,
                email: true,
                username: true,
                companyName: true,
                location: true,
                website: true,
                industry: true,
                role: true,
                CompId: true,
                CusUserId: true,
                createdAt: true
            }
        });

        if (!userProfile) {
            return res.status(404).json({ message: "User not found" });
        }

        if (req.user.role !== "Admin" && req.user.id !== userProfile.id) {
            return res.status(403).json({ message: "Not authorized to view this profile" });
        }

        res.status(200).json({
            message: "Profile fetched successfully!",
            user: userProfile
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const updateCompanyProfile = async (req, res) => {
    try {
        const { cusUserId } = req.params;
        const { username, email, companyName, location, website, industry } = req.body;

        if (!cusUserId) {
            return res.status(400).json({ message: "cusUserId is required" });
        }

        const existing = await prisma.user.findUnique({
            where: { CusUserId: cusUserId }
        });

        if (!existing) {
            return res.status(404).json({ message: "User not found" });
        }

        if (req.user.role !== "Admin" && req.user.id !== existing.id) {
            return res.status(403).json({ message: "Not authorized to update this profile" });
        }

        if (email && email !== existing.email) {
            const emailTaken = await prisma.user.findUnique({ where: { email } });
            if (emailTaken) {
                return res.status(400).json({ message: "Email already in use" });
            }
        }

        if (username && username !== existing.username) {
            const usernameTaken = await prisma.user.findUnique({ where: { username } });
            if (usernameTaken) {
                return res.status(400).json({ message: "Username already in use" });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { CusUserId: cusUserId },
            data: {
                ...(username !== undefined && username !== "" && { username }),
                ...(email !== undefined && email !== "" && { email }),
                ...(companyName !== undefined && companyName !== "" && { companyName }),
                ...(location !== undefined && location !== "" && { location }),
                ...(website !== undefined && { website }),
                ...(industry !== undefined && industry !== "" && { industry }),
            },
            select: {
                id: true,
                email: true,
                username: true,
                companyName: true,
                location: true,
                website: true,
                industry: true,
                role: true,
                CompId: true,
                CusUserId: true,
                createdAt: true
            }
        });

        res.status(200).json({
            message: "Profile updated successfully!",
            user: updatedUser
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const changePassword = async (req, res) => {
    try {
        const { cusUserId } = req.params;
        const { currentPassword, newPassword } = req.body;

        if (!cusUserId) {
            return res.status(400).json({ message: "cusUserId is required" });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ message: "New password must be different from current password" });
        }

        const existing = await prisma.user.findUnique({
            where: { CusUserId: cusUserId },
            select: { id: true, password: true }
        });

        if (!existing) {
            return res.status(404).json({ message: "User not found" });
        }

        if (req.user.role !== "Admin" && req.user.id !== existing.id) {
            return res.status(403).json({ message: "Not authorized to change this password" });
        }

        const isMatch = await bcrypt.compare(currentPassword, existing.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { CusUserId: cusUserId },
            data: { password: hashedPassword }
        });

        res.status(200).json({ message: "Password updated successfully" });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const { cusUserId } = req.params;
        const { password } = req.body;

        if (!cusUserId) {
            return res.status(400).json({ message: "cusUserId is required" });
        }

        if (!password) {
            return res.status(400).json({ message: "Password is required to delete your account" });
        }

        const existing = await prisma.user.findUnique({
            where: { CusUserId: cusUserId },
            select: { id: true, password: true }
        });

        if (!existing) {
            return res.status(404).json({ message: "User not found" });
        }

        if (req.user.role !== "Admin" && req.user.id !== existing.id) {
            return res.status(403).json({ message: "Not authorized to delete this account" });
        }

        const isMatch = await bcrypt.compare(password, existing.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Password is incorrect" });
        }

        await prisma.user.delete({
            where: { CusUserId: cusUserId }
        });

        res.status(200).json({ message: "Account deleted successfully" });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const getAdminStats = async (req, res) => {
    try {
        if (req.user.role !== "Admin") {
            return res.status(403).json({ message: "Forbidden: Admin role required" });
        }

        // Count total users (excluding Admin)
        const totalUsers = await prisma.user.count({
            where: {
                role: {
                    not: "Admin"
                }
            }
        });

        // Count total unique website URLs (not starting with pdf://)
        const urlsGroup = await prisma.site_embeddings.groupBy({
            by: ['url'],
            where: {
                NOT: {
                    url: {
                        startsWith: 'pdf://'
                    }
                }
            }
        });
        const totalUrls = urlsGroup.length;

        // Count total unique PDF source files (starting with pdf://)
        const pdfsGroup = await prisma.site_embeddings.groupBy({
            by: ['url'],
            where: {
                url: {
                    startsWith: 'pdf://'
                }
            }
        });
        const totalPdfs = pdfsGroup.length;

        // Fetch all registered users/companies
        const usersList = await prisma.user.findMany({
            where: {
                role: {
                    not: "Admin"
                }
            },
            select: {
                id: true,
                username: true,
                email: true,
                companyName: true,
                location: true,
                CompId: true,
                CusUserId: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalUrls,
                totalPdfs
            },
            users: usersList
        });
    } catch (error) {
        console.error("❌ Admin Stats Error:", error.message);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

module.exports = { registerCompany, loginUser, getCompanyProfile, updateCompanyProfile, changePassword, deleteAccount, getAdminStats };
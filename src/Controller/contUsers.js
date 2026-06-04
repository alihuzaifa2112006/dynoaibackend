const prisma = require('../Config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const registerCompany = async (req, res) => {
    try {
        const { email, username, password, companyName, location } = req.body;

        // Validation: Sab fields check karo
        if (!email || !username || !password || !companyName || !location) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check karo ke email ya username pehle se toh register nahi hai
        const emailExists = await prisma.user.findUnique({ where: { email } });
        const usernameExists = await prisma.user.findUnique({ where: { username } });

        if (emailExists || usernameExists) {
            return res.status(400).json({ message: "Email or Username already exists" });
        }

        // Password ko secure/hash karo
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);


        const newCompany = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                companyName,
                location
            }
        });

        res.status(201).json({
            message: "Company registered successfully!",
            companyId: newCompany.id
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// Login Here

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // --- STEP A: SUPER ADMIN BYPASS CHECK ---
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            // Admin ke liye direct token generate karo bina DB me dhoonde
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

        // Agar user nahi mila
        if (!user) {
            return res.status(400).json({ message: "Invalid Email or Password" });
        }

        // Password verify karo bcrypt se
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Email or Password" });
        }

        // Company ke liye JWT Token generate karo
        const token = jwt.sign(
            { id: user.id, role: user.role, username: user.username },
            process.env.JWT_SECRET || "fallback_secret_key",
            { expiresIn: '1d' } // 1 din me expire hoga token
        );

        res.status(200).json({
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                username: user.username,
                companyName: user.companyName,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};




module.exports = { registerCompany, loginUser };

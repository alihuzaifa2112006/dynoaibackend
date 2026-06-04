require('dotenv').config();
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

const pool = new Pool({ connectionString: process.env.DATABASELOCALURL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });



module.exports = prisma;
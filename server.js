const app = require('./src/app.js');
const dotenv = require('dotenv');
dotenv.config();
const prisma = require('./src/Config/db.js')




app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');
const userRouter = require('./Routes/userRoutes');
const { protect, authorizeRoles } = require('./middleware/middlewar');
const scraperRoute = require('./Routes/scraperRoute');



app.use(cors());
dotenv.config();
app.use(express.json());

app.use(express.urlencoded({ extended: true }));


app.get('/api/firstApi', (req, res) => {

    res.send("Hello World from firstApi");
})

app.use('/api/user', userRouter);

app.use('/api/scraper', protect, scraperRoute);

module.exports = app;
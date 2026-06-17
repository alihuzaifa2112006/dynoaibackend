const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const userRouter = require('./Routes/userRoutes');
const { protect, authorizeRoles } = require('./middleware/middlewar');
const scraperRoute = require('./Routes/scraperRoute');
const chatbotDesignRouter = require('./Routes/chatbotDesignRoutes');



app.use(cors());
dotenv.config();
// app.use(express.json());

// app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));


app.get('/api/firstApi', (req, res) => {

    res.send("Hello World from firstApi");
})

app.use('/api/user', userRouter);

app.use('/api/scraper', protect, scraperRoute);

app.use('/api/chatbot-design', chatbotDesignRouter);

module.exports = app;
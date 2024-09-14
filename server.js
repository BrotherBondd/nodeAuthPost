import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import connectMongoDB from './db.js';
// B1kv0U1piSVGSwOn 

const app = express();
const PORT = process.env.PORT || 3000;

// connect to mongoDB  database
connectMongoDB();
app.get('/', (req, res) => {
    res.send('hello from express ');
})

app.listen(PORT, () => {
    console.log(`server is running on port http:localhost:${PORT} `);
});
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const router = express.Router();

const genAI = new GoogleGenerativeAI("AIzaSyATdKpQfKcrqDNBR7AgtH5pnWWJGUXJNjk");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

router.post('/chat', async (req, res) => {
    const { message } = req.body;

    try {
        const result = await model.generateContent(message);
        const botReply = result.response.text();
        console.log(botReply)
        res.json({ reply: botReply });
    } catch (error) {
        console.error('Erreur lors de la communication avec Gemini :', error);
        res.status(500).json({ error: 'Erreur lors de la communication avec Gemini' });
    }
});

module.exports = router;

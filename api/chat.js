const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { userMessage, questionId } = req.body;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are an AI chatbot." },
                    { role: "user", content: userMessage }
                ]
            })
        });

        const data = await response.json();
        res.status(200).json({ reply: data.choices[0].message.content });
    } catch (error) {
        console.error('Error communicating with OpenAI API:', error);
        res.status(500).json({ error: 'Failed to fetch AI response' });
    }
};

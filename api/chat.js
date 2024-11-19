const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { userMessage, questionId } = req.body;
    const apiKey = process.env.OPENAI_API_KEY; // 環境変数からキーを取得

    if (!apiKey) {
        return res.status(500).json({ error: 'OpenAI API key is not configured' });
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are an AI solving riddles.' },
                    { role: 'user', content: userMessage },
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${errorText}`);
        }

        const data = await response.json();
        res.status(200).json({ reply: data.choices[0].message.content });
    } catch (error) {
        console.error('Error communicating with OpenAI:', error.message);
        res.status(500).json({ error: 'Failed to fetch AI response' });
    }
};

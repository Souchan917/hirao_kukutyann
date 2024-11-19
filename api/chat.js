const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userMessage, questionId } = req.body;

    const prompts = {
        3: "AI-based puzzle game. Guess the animal name based on questions."
    };

    const prompt = prompts[questionId] || "Default prompt for your game.";

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
                    { role: "system", content: prompt },
                    { role: "user", content: userMessage }
                ]
            })
        });

        const data = await response.json();

        if (data.choices && data.choices.length > 0) {
            res.status(200).json({ reply: data.choices[0].message.content });
        } else {
            throw new Error('Invalid response from OpenAI API');
        }
    } catch (error) {
        console.error('Error communicating with OpenAI API:', error);
        res.status(500).json({ error: 'Failed to fetch AI response' });
    }
};

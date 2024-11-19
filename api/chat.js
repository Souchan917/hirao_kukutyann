import fetch from 'node-fetch';

export default async (req, res) => {
    console.log('Request body:', req.body);

    const { userMessage, questionId } = req.body;
    const prompts = {
        1: 'What is the capital of France?',
        2: 'What is 2 + 2?',
        3: 'Ask me about animals.'
    };

    const prompt = prompts[questionId] || 'Default prompt.';
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('OPENAI_API_KEY is not set');
        return res.status(500).json({ error: 'Server configuration error: API key is missing.' });
    }

    try {
        const response = await fetch('https://api.openai.com/v1/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'text-davinci-003',
                prompt: `${prompt}\n\nUser: ${userMessage}\nAI:`,
                max_tokens: 50
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('OpenAI response:', data);
        res.status(200).json({ reply: data.choices[0].text.trim() });
    } catch (error) {
        console.error('Error communicating with OpenAI:', error.message);
        res.status(500).json({ error: 'Failed to fetch AI response' });
    }
};

import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { userMessage, questionId } = req.body;

    const prompts = {
        3: "AI-based puzzle game. Guess the animal name based on questions."
    };

    const prompt = prompts[questionId] || "Default prompt for your game.";

    try {
        console.log("Received message:", userMessage);
        console.log("Selected question ID:", questionId);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY_kuku}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: prompt },
                    { role: "user", content: userMessage }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        console.log("OpenAI response data:", data);

        res.status(200).json({ reply: data.choices[0].message.content });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch AI response' });
    }
}

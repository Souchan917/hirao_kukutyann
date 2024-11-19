// Dynamic import for node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = async (req, res) => {
    console.log("--- Incoming Request ---");
    console.log("Request Body:", req.body);

    const { userMessage, questionId } = req.body;

    const prompts = {
        3: "AI-based puzzle game. Guess the animal name based on questions."
    };

    const prompt = prompts[questionId] || "Default prompt for your game.";

    console.log("Prompt Selected:", prompt);

    try {
        console.log("Preparing to send request to OpenAI API...");
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

        console.log("Request sent to OpenAI API. Awaiting response...");
        const data = await response.json();
        console.log("Response from OpenAI API:", data);

        if (!response.ok) {
            console.error("OpenAI API returned an error:", data);
            return res.status(response.status).json({ error: data });
        }

        console.log("Sending AI response back to client...");
        res.status(200).json({ reply: data.choices[0].message.content });
    } catch (error) {
        console.error("Error communicating with OpenAI API:", error);
        res.status(500).json({ error: 'Failed to fetch AI response' });
    } finally {
        console.log("--- Request Completed ---");
    }
};

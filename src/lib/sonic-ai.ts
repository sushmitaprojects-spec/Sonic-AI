import OpenAI from "openai";

const sonicResponses = [
  "That's a fascinating question! 🌟 Let me break it down for you.",
  "Great thinking! 💡 This topic has been evolving rapidly, and there are several perspectives worth considering.",
  "I love where you're going with this! ✨ Let me share some thoughts.",
  "Excellent question! 🎯 Here's my take: the answer isn't as straightforward as it might seem.",
  "That's something I find really interesting! 🤔 The short answer is that it depends on context.",
  "You're touching on something really important here. 🌈 The way I see it, there are three main factors to consider.",
];

export async function* streamResponse(
  message: string,
  language: string = "English",
  history: { role: "user" | "assistant" | "system", content: string }[] = []
): AsyncGenerator<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (apiKey && apiKey !== "your_openai_api_key_here") {
    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true, // Client-side demo
      });

      const stream = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              `You are Sonic AI, a helpful assistant. Provide short, concise answers without any hashtags or special tags. Your answer MUST be no more than 2 sentences. You MUST respond in ${language}. Your tone should be natural, casual, and conversational, NOT bookish or overly formal.`,
          },
          ...history,
          { role: "user", content: message },
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) yield content;
      }
      return;
    } catch (error) {
      console.error("OpenAI Error:", error);
      yield "⚠️ Error connecting to OpenAI. Falling back to simulated mode... \n\n";
    }
  }

  // Fallback / Simulated Logic
  const index = Math.abs(hashCode(message)) % sonicResponses.length;
  const response = sonicResponses[index];

  const words = response.split(" ");
  for (const word of words) {
    yield word + " ";
    await new Promise((r) => setTimeout(r, 30 + Math.random() * 40));
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}


import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key || key === "your_gemini_api_key_here" || key === "") {
        throw new Error("API Key Missing: Please check your .env file and restart the dev server.");
    }
    return key;
};

export async function generateImage(prompt: string): Promise<string> {
    const apiKey = getApiKey();
    const ai: any = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: prompt,
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image data returned.");
    } catch (error: any) {
        console.error("Gemini Image Error:", error);
        throw error;
    }
}

export async function generateVideo(prompt: string, onUpdate: (status: string) => void): Promise<string> {
    const apiKey = getApiKey();
    const ai: any = new GoogleGenAI({ apiKey });

    try {
        let operation = await ai.models.generateVideos({
            model: "veo-3.1-generate-preview",
            prompt: prompt,
        });

        while (!operation.done) {
            onUpdate("Waiting for video generation to complete...");
            await new Promise((resolve) => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({
                operation: operation,
            });
        }

        const videoData = operation.response.generatedVideos[0].video;
        console.log("Full Video Object JSON:", JSON.stringify(videoData, null, 2));

        // Try multiple ways to get the URI
        let finalUrl = null;

        if (typeof videoData === 'string' && videoData.startsWith('http')) {
            finalUrl = videoData;
        } else if (videoData.uri) {
            finalUrl = videoData.uri;
        } else if (videoData.name) {
            // If it has a name (e.g. "files/xyz"), it might be a file name
            // Try to fetch the file details to get the URI
            try {
                const fileInfo = await ai.files.get({ file: videoData });
                console.log("Fetched file info:", fileInfo);
                finalUrl = fileInfo.uri;
            } catch (e) {
                console.warn("Could not fetch file info via ai.files.get", e);
            }
        }

        // If still no URL, check if there's a download URL or similar
        if (!finalUrl && videoData.downloadUrl) {
            finalUrl = videoData.downloadUrl;
        }

        if (!finalUrl) {
            // Last resort: constructive fallback for debugging
            console.error("Failed to find a playable URL. Object structure:", videoData);
            throw new Error("Video generated but no playable URL found. Please check console for object structure.");
        }

        // Append API key to the URI if it's a Google API URL to allow browser playback
        if (finalUrl.includes("generativelanguage.googleapis.com") && !finalUrl.includes("key=")) {
            const separator = finalUrl.includes("?") ? "&" : "?";
            finalUrl += `${separator}key=${apiKey}`;
        }

        console.log("Final constructed Video URL:", finalUrl);
        return finalUrl;
    } catch (error: any) {
        console.error("Gemini Video Error:", error);
        throw error;
    }
}

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const getApiKey = () => {
    const key = import.meta.env.VITE_ELEVENLABS_API_KEY;
    if (!key || key === "your_elevenlabs_api_key_here" || key === "") {
        throw new Error("ElevenLabs API Key Missing: Please check your .env file.");
    }
    return key;
};

export async function generateAudio(text: string, voiceId: string = 'UCXL5JWLt8eKIpNg5dkk'): Promise<string> {
    const apiKey = getApiKey();
    const client = new ElevenLabsClient({ apiKey });

    try {
        const audio = await client.textToSpeech.convert(voiceId, {
            text: text,
            modelId: 'eleven_v3',
            outputFormat: 'mp3_44100_128',
        });

        // In browser, the response is a ReadableStream (web stream)
        // We convert it to a Blob and then a URL
        const reader = audio.getReader();
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        const blob = new Blob(chunks, { type: 'audio/mpeg' });
        return URL.createObjectURL(blob);
    } catch (error: unknown) {
        console.error("ElevenLabs Error:", error);
        throw error;
    }
}

export async function transcribeAudio(file: Blob): Promise<string> {
    const apiKey = getApiKey();
    const client = new ElevenLabsClient({ apiKey });

    try {
        const response = await client.speechToText.convert({
            modelId: "scribe_v1",
            file: file,
            tagAudioEvents: false,
        });

        // The response contains the transcribed text
        return response.text;
    } catch (error: unknown) {
        console.error("ElevenLabs STT Error:", error);
        throw error;
    }
}

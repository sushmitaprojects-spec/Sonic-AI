import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, Zap, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { streamResponse } from "@/lib/sonic-ai";
import { generateImage, generateVideo } from "@/lib/gemini";
import { generateAudio, transcribeAudio } from "@/lib/elevenlabs";
import { supabase, uploadMedia } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Image, Video, Music, MessageSquare, Mic, Globe, Square, Copy } from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GalleryView } from "./GalleryView";
import { SettingsView } from "./SettingsView";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "text" | "image" | "video" | "audio";
  mediaUrl?: string;
}

const suggestions = [
  { icon: Sparkles, text: "Explain quantum computing simply" },
  { icon: Zap, text: "Write a creative short story" },
  { icon: Bot, text: "Help me debug my code" },
  { icon: Sparkles, text: "What are the latest tech trends?" },
];

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [mode, setMode] = useState<"text" | "image" | "video" | "audio">("text");
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [activeView, setActiveView] = useState<"chat" | "gallery" | "settings">("chat");
  const [sessionId, setSessionId] = useState<string>(crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const voices = [
    { name: "Text Only", id: "" },
    { name: "Krishna", id: "t9cLgoxzEUuBpcFOetKU" },
    { name: "ANKITA", id: "jUjRbhZWoMK4aDciW36V" },
    { name: "Riya", id: "mActWQg9kibLro6Z2ouY" },
    { name: "Viraj", id: "FmBhnvP58BK0vz65OOj7" },
  ];

  const languages = [
    "English",
    "Hindi",
    "Kannada",
    "Bengali",
    "Telugu",
    "Tamil",
    "Marathi",
    "Spanish",
    "French",
    "German",
    "Turkish"
  ];

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Fetch messages on mount
  useEffect(() => {
    const fetchMessages = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error && error.code !== "42703") { // Ignore missing column locally if not migrated yet
        console.error("Error fetching messages:", error);
      } else if (data) {
        setMessages(data.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          type: m.type,
          mediaUrl: m.media_url
        })));
      }
    };

    fetchMessages();
  }, [sessionId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);
        try {
          const transcribedText = await transcribeAudio(audioBlob);
          if (transcribedText && transcribedText.trim()) {
            handleSend(transcribedText);
          }
        } catch (error) {
          console.error("Transcription failed", error);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleSend = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || isStreaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: msgText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    const assistantId = crypto.randomUUID();
    const { data: { user } } = await supabase.auth.getUser();

    // Create a generic session string
    const currentSessionId = sessionId;

    // Handle new chat session
    if (messages.length === 0 && user) {
      const { error: sessionError } = await supabase.from("chat_sessions").insert({
        id: currentSessionId,
        user_id: user.id,
        title: msgText.substring(0, 30) + (msgText.length > 30 ? "..." : "")
      });
      if (sessionError && sessionError.code !== "42P01") { // Ignoring missing table gracefully
        console.warn("Could not save chat session metadata:", sessionError);
      }
    }

    // Persist User Message
    if (user) {
      await supabase.from("messages").insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        session_id: currentSessionId,
        role: "user",
        content: msgText,
        type: "text"
      });
    }

    if (mode === "text") {
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: selectedVoice ? "Generating voice response..." : "" }]);
      let fullContent = "";

      const historyContext = messages
        .filter(m => m.type === "text" || !m.type) // Only pass text messages
        .slice(-10) // Limit to last 10 messages for context
        .map(m => ({
          role: m.role,
          content: m.content || ""
        }));

      for await (const chunk of streamResponse(msgText, selectedLanguage, historyContext)) {
        fullContent += chunk;
        if (!selectedVoice) {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: (m.content + chunk).replace(/#ElevenLabs/gi, "") } : m))
          );
        }
      }
      const cleanedContent = fullContent.replace(/#ElevenLabs/gi, "").trim();
      if (user) {
        await supabase.from("messages").insert({
          id: assistantId,
          user_id: user.id,
          session_id: currentSessionId,
          role: "assistant",
          content: cleanedContent,
          type: "text"
        });
      }

      if (selectedVoice) {
        try {
          const audioUrl = await generateAudio(cleanedContent, selectedVoice);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: "", mediaUrl: audioUrl } : m))
          );
        } catch (e) {
          console.error("Voice generation failed", e);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: "Voice generation failed." } : m))
          );
        }
      }
    } else if (mode === "image") {
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "Generating image...", type: "text" }]);
      try {
        const imageUrl = await generateImage(msgText);
        const persistentUrl = await uploadMedia(imageUrl, 'images');

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: "", type: "image", mediaUrl: persistentUrl } : m))
        );

        if (user) {
          await supabase.from("messages").insert({
            id: assistantId,
            user_id: user.id,
            session_id: currentSessionId,
            role: "assistant",
            content: "",
            type: "image",
            media_url: persistentUrl
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: "Error: " + errorMessage } : m))
        );
      }
    } else if (mode === "video") {
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "Starting video generation...", type: "text" }]);
      try {
        const videoUrl = await generateVideo(msgText, (status) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: status } : m))
          );
        });
        const persistentUrl = await uploadMedia(videoUrl, 'videos');

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: "", type: "video", mediaUrl: persistentUrl } : m))
        );

        if (user) {
          await supabase.from("messages").insert({
            id: assistantId,
            user_id: user.id,
            session_id: currentSessionId,
            role: "assistant",
            content: "",
            type: "video",
            media_url: persistentUrl
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: "Error: " + errorMessage } : m))
        );
      }
    } else if (mode === "audio") {
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "Generating audio...", type: "text" }]);
      try {
        const audioUrl = await generateAudio(msgText, selectedVoice || 'UCXL5JWLt8eKIpNg5dkk');
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: "", type: "audio", mediaUrl: audioUrl } : m))
        );
        // Audio might be too large for storage without proper handling, leaving URL for now or simple persistence
        if (user) {
          await supabase.from("messages").insert({
            id: assistantId,
            user_id: user.id,
            session_id: currentSessionId,
            role: "assistant",
            content: "",
            type: "audio",
            media_url: audioUrl
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: "Error: " + errorMessage } : m))
        );
      }
    }

    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <SidebarProvider>
      <AppSidebar
        activeView={activeView}
        currentSessionId={sessionId}
        onViewChange={(view, newSessionId) => {
          setActiveView(view);
          if (view === "chat") {
            if (newSessionId) {
              setSessionId(newSessionId);
            } else {
              setSessionId(crypto.randomUUID());
              setMessages([]);
            }
          }
        }}
      />
      <SidebarInset className="flex flex-col h-screen app-theme-bg overflow-hidden w-full relative">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 sticky top-0 z-10 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-2 h-8 w-8 text-foreground/70 hover:text-foreground" />
            <div className="h-9 w-9 rounded-xl gradient-bg flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight gradient-text font-[Space_Grotesk]">
              Sonic AI
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-3 rounded-xl border-border/60 bg-card/50 hover:bg-secondary/60 transition-all duration-200">
                  <Globe className="h-4 w-4 mr-2 text-primary" />
                  <span className="font-medium text-sm">
                    {selectedLanguage}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 max-h-64 overflow-y-auto">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`rounded-lg px-3 py-2 cursor-pointer transition-colors ${selectedLanguage === lang ? 'bg-primary/10 text-primary focus:bg-primary/15' : 'hover:bg-secondary'}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{lang}</span>
                      {selectedLanguage === lang && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-3 rounded-xl border-border/60 bg-card/50 hover:bg-secondary/60 transition-all duration-200">
                  <Mic className="h-4 w-4 mr-2 text-primary" />
                  <span className="font-medium text-sm">
                    {voices.find((v) => v.id === selectedVoice)?.name || "Text Only"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl p-1">
                {voices.map((v) => (
                  <DropdownMenuItem
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`rounded-lg px-3 py-2 cursor-pointer transition-colors ${selectedVoice === v.id ? 'bg-primary/10 text-primary focus:bg-primary/15' : 'hover:bg-secondary'}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{v.name || "Text Only"}</span>
                      {selectedVoice === v.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-xs text-muted-foreground hidden sm:inline-block">v1.0</span>
          </div>
        </header>

        {/* Main Content */}
        {activeView === "gallery" ? (
          <GalleryView />
        ) : activeView === "settings" ? (
          <SettingsView />
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {!hasMessages ? (
              /* Welcome Screen */
              <div className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
                <div className="flex flex-col items-center gap-4 max-w-lg text-center">
                  <div className="h-16 w-16 rounded-2xl gradient-bg flex items-center justify-center glow-primary animate-pulse">
                    <Zap className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight gradient-text font-[Space_Grotesk]">
                    How can I help you today?
                  </h2>
                  <p className="text-muted-foreground text-sm md:text-base">
                    I'm Sonic AI, your intelligent conversation partner. Ask me anything.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s.text)}
                      className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-card/50 hover:bg-secondary/60 hover:border-primary/30 transition-all duration-200 text-left group"
                    >
                      <s.icon className="h-4 w-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-sm text-foreground/80">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Messages */
              <ScrollArea className="flex-1">
                <div ref={scrollRef} className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <Avatar className="h-8 w-8 shrink-0 mt-1">
                          <AvatarFallback className="gradient-bg text-primary-foreground text-xs font-bold">
                            S
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[80%] relative group rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user"
                          ? "gradient-bg text-primary-foreground rounded-br-md"
                          : "bg-card border border-border/50 text-foreground rounded-bl-md"
                          }`}
                      >
                        {msg.type === "image" && msg.mediaUrl ? (
                          <img src={msg.mediaUrl} alt="Generated" className="rounded-lg max-w-full h-auto" />
                        ) : msg.type === "video" && msg.mediaUrl ? (
                          <div className="space-y-2">
                            <video
                              src={msg.mediaUrl}
                              controls
                              autoPlay
                              playsInline
                              className="rounded-lg max-w-full h-auto border border-border/50 shadow-sm"
                            />
                            <a
                              href={msg.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-primary hover:underline block text-center"
                            >
                              Open in separate tab
                            </a>
                          </div>
                        ) : msg.type === "audio" && msg.mediaUrl ? (
                          <div className="space-y-1 py-1">
                            <audio
                              src={msg.mediaUrl}
                              controls
                              className="max-w-full h-8 brightness-90 contrast-125"
                            />
                          </div>
                        ) : (
                          <>
                            {msg.content && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === "user" ? "text-primary-foreground hover:bg-white/20 hover:text-white" : "text-foreground hover:bg-secondary"
                                  }`}
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.content);
                                  toast.success("Copied to clipboard");
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                            <div className={msg.content ? "pr-6" : ""}>
                              {msg.content}
                              {msg.role === "assistant" && isStreaming && msg.content.length > 0 && msg.id === messages[messages.length - 1]?.id && (
                                <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse rounded-full align-middle" />
                              )}
                            </div>
                            {msg.mediaUrl && msg.type !== "image" && msg.type !== "video" && msg.type !== "audio" && (
                              <div className={`space-y-1 py-1 ${msg.content ? 'mt-2' : ''}`}>
                                <audio
                                  src={msg.mediaUrl}
                                  controls
                                  autoPlay
                                  className="max-w-full h-8 brightness-90 contrast-125"
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <Avatar className="h-8 w-8 shrink-0 mt-1">
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">
                            U
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Input Area */}
            <div className="border-t border-border/50 p-4">
              <div className="max-w-3xl mx-auto">
                <div className="flex gap-2 items-end bg-card/60 border border-border/60 rounded-2xl p-2 focus-within:border-primary/40 focus-within:glow-primary transition-all duration-200">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0 opacity-70 hover:opacity-100">
                        {mode === "text" && <MessageSquare className="h-4 w-4" />}
                        {mode === "image" && <Image className="h-4 w-4" />}
                        {mode === "video" && <Video className="h-4 w-4" />}
                        {mode === "audio" && <Music className="h-4 w-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-32">
                      <DropdownMenuItem onClick={() => setMode("text")} className="gap-2">
                        <MessageSquare className="h-4 w-4" /> Text
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMode("image")} className="gap-2">
                        <Image className="h-4 w-4" /> Image
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMode("video")} className="gap-2">
                        <Video className="h-4 w-4" /> Video
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMode("audio")} className="gap-2">
                        <Music className="h-4 w-4" /> Audio
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isRecording || isTranscribing}
                    placeholder={
                      isTranscribing ? "Transcribing audio..." :
                        isRecording ? "Recording... Click stop to send." :
                          mode === "text" ? "Ask Sonic AI anything..." :
                            mode === "image" ? "Describe the image you want..." :
                              mode === "video" ? "Describe the video you want..." :
                                "Describe the audio you want..."
                    }
                    className="flex-1 min-h-[44px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground"
                    rows={1}
                  />

                  {input.trim() || isStreaming ? (
                    <Button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isStreaming}
                      size="icon"
                      className="h-9 w-9 rounded-xl gradient-bg hover:opacity-90 transition-opacity shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  ) : isRecording ? (
                    <Button
                      onClick={stopRecording}
                      size="icon"
                      className="h-9 w-9 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-opacity shrink-0 animate-pulse"
                    >
                      <Square className="h-4 w-4 fill-current" />
                    </Button>
                  ) : (
                    <Button
                      onClick={startRecording}
                      disabled={isTranscribing}
                      size="icon"
                      className={`h-9 w-9 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-opacity shrink-0 ${isTranscribing ? "opacity-50" : ""}`}
                    >
                      {isTranscribing ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  Sonic AI uses simulated responses. Connect a backend for real AI capabilities.
                </p>
              </div>
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Index;

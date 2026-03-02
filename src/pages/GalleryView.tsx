import { useState, useEffect } from "react";
import { Aperture, Video, X, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface MediaItem {
    id: string;
    url: string;
    label: string;
}

export function GalleryView({ isPublic = false }: { isPublic?: boolean }) {
    const [activeTab, setActiveTab] = useState<"image" | "video">("image");
    const [images, setImages] = useState<MediaItem[]>([]);
    const [videos, setVideos] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

    const handleDownload = async (url: string, label: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = label;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Error downloading media:", error);
            // Fallback for cross-origin or other errors
            window.open(url, "_blank");
        }
    };

    useEffect(() => {
        const fetchGallery = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user && !isPublic) return;

            let query = supabase
                .from("messages")
                .select("*")
                .in("type", ["image", "video"]);

            if (user && !isPublic) {
                query = query.eq("user_id", user.id);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching gallery:", error);
            } else if (data) {
                const fetchedImages = data
                    .filter(m => m.type === "image" && m.media_url)
                    .map(m => ({
                        id: m.id,
                        url: m.media_url,
                        label: m.content || `image_${m.id.slice(0, 4)}.png`
                    }));

                const fetchedVideos = data
                    .filter(m => m.type === "video" && m.media_url)
                    .map(m => ({
                        id: m.id,
                        url: m.media_url,
                        label: m.content || `video_${m.id.slice(0, 4)}.mp4`
                    }));

                setImages(fetchedImages);
                setVideos(fetchedVideos);
            }
            setLoading(false);
        };

        fetchGallery();
    }, []);

    return (
        <div className="flex-1 overflow-auto bg-black p-8 text-white min-h-full">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Toggle Header */}
                <div className="flex items-center justify-center gap-4 border-b border-zinc-800 pb-6 relative">
                    <button
                        onClick={() => setActiveTab("image")}
                        className={`flex items-center gap-3 px-6 py-3 font-mono text-xs tracking-widest uppercase transition-all duration-300 ${activeTab === "image"
                            ? "bg-red-600 text-white font-bold"
                            : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700"
                            }`}
                    >
                        <Aperture className={`w-4 h-4 ${activeTab === "image" ? "text-white" : "text-red-500"}`} />
                        [ Images ]
                    </button>

                    <button
                        onClick={() => setActiveTab("video")}
                        className={`flex items-center gap-3 px-6 py-3 font-mono text-xs tracking-widest uppercase transition-all duration-300 ${activeTab === "video"
                            ? "bg-red-600 text-white font-bold"
                            : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700"
                            }`}
                    >
                        <Video className={`w-4 h-4 ${activeTab === "video" ? "text-white" : "text-red-500"}`} />
                        [ Videos ]
                    </button>

                    <div className="absolute right-0 text-[10px] font-mono tracking-widest text-zinc-500 uppercase hidden sm:block">
                        [ {activeTab === "image" ? images.length : videos.length} FILES INDEXED ]
                    </div>
                </div>

                {/* Dynamic Content Area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="h-8 w-8 border-4 border-red-600/20 border-t-red-600 animate-spin" />
                        <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Scanning Repository...</span>
                    </div>
                ) : (
                    <>
                        {activeTab === "image" && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {images.length === 0 ? (
                                    <div className="text-center py-20 text-zinc-700 font-mono text-xs uppercase tracking-widest">
                                        [ No Image Data Found in Your Repository ]
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {images.map((img) => (
                                            <div key={img.id} className="group relative cursor-pointer" onClick={() => setSelectedMedia(img)}>
                                                <div className="relative aspect-square overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-red-500/50 transition-colors">
                                                    <img
                                                        src={img.url}
                                                        alt={img.label}
                                                        className="object-cover w-full h-full opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] will-change-transform"
                                                    />
                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end translate-y-2 group-hover:translate-y-0">
                                                        <span className="text-[10px] font-mono text-white tracking-widest uppercase truncate">{img.label}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}

                        {activeTab === "video" && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {videos.length === 0 ? (
                                    <div className="text-center py-20 text-zinc-700 font-mono text-xs uppercase tracking-widest">
                                        [ No Video Data Found in Your Repository ]
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {videos.map((vid) => (
                                            <div key={vid.id} className="group relative cursor-pointer" onClick={() => setSelectedMedia(vid)}>
                                                <div className="relative aspect-video overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-red-500/50 transition-colors flex items-center justify-center">
                                                    <video
                                                        src={vid.url}
                                                        playsInline
                                                        loop
                                                        muted
                                                        autoPlay
                                                        className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-all duration-500"
                                                    />
                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end translate-y-2 group-hover:translate-y-0">
                                                        <span className="text-[10px] font-mono text-white tracking-widest uppercase truncate">{vid.label}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}
                    </>
                )}

            </div>

            {/* Brutalist Lightbox Modal */}
            {selectedMedia && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(selectedMedia.url, selectedMedia.label);
                            }}
                            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-red-500/50 hover:bg-red-950/30 text-white px-4 py-2 uppercase tracking-widest font-mono text-[10px] transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            [ SAVE ]
                        </button>
                        <button
                            onClick={() => setSelectedMedia(null)}
                            className="flex items-center justify-center w-10 h-10 bg-zinc-900 border border-zinc-800 hover:border-red-500 text-white hover:text-red-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="max-w-5xl w-full max-h-[85vh] flex flex-col items-center justify-center relative group">
                        {activeTab === "image" ? (
                            <img
                                src={selectedMedia.url}
                                alt={selectedMedia.label}
                                className="max-w-full max-h-[80vh] object-contain border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                            />
                        ) : (
                            <video
                                src={selectedMedia.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[80vh] border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                            />
                        )}
                        <div className="mt-6 text-center">
                            <span className="font-mono text-xs uppercase tracking-widest text-zinc-500 bg-zinc-900/80 px-4 py-1 border border-zinc-800">
                                {selectedMedia.label}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

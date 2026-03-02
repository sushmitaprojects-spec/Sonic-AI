import { Zap, MessageSquare, Image as ImageIcon, Settings, LogOut, ChevronRight, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    SidebarRail,
} from "@/components/ui/sidebar";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface AppSidebarProps {
    activeView: "chat" | "gallery" | "settings";
    onViewChange: (view: "chat" | "gallery" | "settings", sessionId?: string) => void;
    currentSessionId?: string | null;
}

const menuItems = [
    { id: "chat", name: "[01] // RECENT_CHATS", icon: MessageSquare },
    { id: "gallery", name: "[02] // GALLERY", icon: ImageIcon },
    { id: "settings", name: "[03] // SETTINGS", icon: Settings },
] as const;

export function AppSidebar({ activeView, onViewChange, currentSessionId }: AppSidebarProps) {
    const [sessions, setSessions] = useState<{ id: string, title: string }[]>([]);
    const [showAllSessions, setShowAllSessions] = useState(false);

    const displayedSessions = showAllSessions ? sessions : sessions.slice(0, 5);

    useEffect(() => {
        const fetchSessions = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
                .from('chat_sessions')
                .select('*')
                .order('created_at', { ascending: false });
            if (data) setSessions(data);
        };
        fetchSessions();
    }, [activeView, currentSessionId]); // Re-fetch on view or session change

    return (
        <Sidebar className="border-r-0 border-r-transparent bg-sidebar">
            <SidebarHeader className="pt-6 pb-8 px-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-red-600 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="text-xl font-black tracking-tighter text-sidebar-foreground uppercase font-[Space_Grotesk]">
                        Sonic_OS
                    </h2>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-[10px] uppercase font-bold tracking-widest text-sidebar-foreground/50 mb-2 px-2">
                        System / Modules
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {menuItems.map((item) => {
                                const isActive = activeView === item.id && (item.id !== "chat" || !currentSessionId);

                                if (item.id === "chat") {
                                    return (
                                        <Collapsible key={item.id} defaultOpen className="group/collapsible">
                                            <SidebarMenuItem>
                                                <CollapsibleTrigger asChild>
                                                    <SidebarMenuButton
                                                        variant="default"
                                                        onClick={() => onViewChange(item.id)}
                                                        className={`
                                                            rounded-none transition-colors h-10 w-full justify-start group border-l-2
                                                            ${activeView === "chat" ? "bg-sidebar-accent border-red-500 text-sidebar-foreground" : "border-transparent hover:bg-sidebar-accent/50 hover:border-sidebar-border"}
                                                        `}
                                                    >
                                                        <item.icon className={`h-4 w-4 mr-2 transition-transform ${activeView === "chat" ? "text-red-500" : "text-sidebar-foreground/60 group-hover:text-red-400"}`} />
                                                        <span className={`font-mono text-xs transition-colors ${activeView === "chat" ? "text-sidebar-foreground font-bold" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"}`}>
                                                            {item.name}
                                                        </span>
                                                        <ChevronRight className="ml-auto h-4 w-4 text-sidebar-foreground/60 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                    </SidebarMenuButton>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                    <SidebarMenuSub className="border-sidebar-border pr-0 mr-0">
                                                        <SidebarMenuSubItem>
                                                            <SidebarMenuSubButton
                                                                onClick={() => onViewChange("chat")}
                                                                className="h-8 hover:bg-sidebar-accent hover:text-red-500 text-sidebar-foreground/60 cursor-pointer transition-colors w-full rounded-none"
                                                            >
                                                                <Plus className="h-3 w-3 mr-1" />
                                                                <span className="font-mono text-[10px] uppercase tracking-widest">+ New Terminal Session</span>
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                        {displayedSessions.map((session) => (
                                                            <SidebarMenuSubItem key={session.id}>
                                                                <SidebarMenuSubButton
                                                                    isActive={currentSessionId === session.id}
                                                                    onClick={() => onViewChange("chat", session.id)}
                                                                    className={`h-8 cursor-pointer transition-colors w-full rounded-none font-mono text-xs truncate
                                                                        ${currentSessionId === session.id ? "text-red-500 bg-red-950/20" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"}`}
                                                                >
                                                                    <span className="truncate w-full block">_ {session.title}</span>
                                                                </SidebarMenuSubButton>
                                                            </SidebarMenuSubItem>
                                                        ))}
                                                        {sessions.length > 5 && (
                                                            <SidebarMenuSubItem>
                                                                <SidebarMenuSubButton
                                                                    onClick={() => setShowAllSessions(!showAllSessions)}
                                                                    className="h-8 cursor-pointer transition-colors w-full rounded-none font-mono text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent border-t border-sidebar-border mt-1"
                                                                >
                                                                    <span className="truncate w-full block text-center">
                                                                        {showAllSessions ? "_ LESS" : `_ MORE (${sessions.length - 5})`}
                                                                    </span>
                                                                </SidebarMenuSubButton>
                                                            </SidebarMenuSubItem>
                                                        )}
                                                    </SidebarMenuSub>
                                                </CollapsibleContent>
                                            </SidebarMenuItem>
                                        </Collapsible>
                                    );
                                }

                                return (
                                    <SidebarMenuItem key={item.id}>
                                        <SidebarMenuButton
                                            variant="default"
                                            onClick={() => onViewChange(item.id)}
                                            className={`
                        rounded-none transition-colors h-10 w-full justify-start group border-l-2
                        ${isActive ? "bg-sidebar-accent border-red-500 text-sidebar-foreground" : "border-transparent hover:bg-sidebar-accent/50 hover:border-sidebar-border"}
                      `}
                                        >
                                            <item.icon className={`h-4 w-4 mr-2 transition-transform ${isActive ? "text-red-500 scale-110" : "text-sidebar-foreground/60 group-hover:scale-110 group-hover:text-red-400"}`} />
                                            <span className={`font-mono text-xs transition-colors ${isActive ? "text-sidebar-foreground font-bold" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"}`}>
                                                {item.name}
                                            </span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>



            <SidebarRail />
        </Sidebar>
    );
}

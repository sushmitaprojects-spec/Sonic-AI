import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { Save, User, Moon, Sun, Monitor, Upload } from "lucide-react";
import { toast } from "sonner";

export function SettingsView() {
    const { theme, setTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({
        name: "",
        email: "",
        phone: "",
        avatarUrl: "",
    });

    useEffect(() => {
        const loadProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setProfile((prev) => ({
                    ...prev,
                    email: user.email || "",
                    name: user.user_metadata?.full_name || "",
                    avatarUrl: user.user_metadata?.avatar_url || "",
                    phone: user.phone || ""
                }));
            }
        };
        loadProfile();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: profile.name,
                    avatar_url: profile.avatarUrl
                }
            });
            // Currently phone numbers or emails might require different auth procedures depending on Supabase config,
            // so we'll just save the metadata for now.
            if (error) throw error;

            toast.success("Profile updated successfully!");
        } catch (e: unknown) {
            const error = e as Error;
            toast.error(error.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-8" style={{ scrollbarWidth: "none" }}>
            <div className="max-w-3xl mx-auto space-y-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-[Space_Grotesk] gradient-text mb-2">Settings</h2>
                    <p className="text-muted-foreground">Manage your account settings and theme preferences.</p>
                </div>

                {/* Profile Section */}
                <div className="space-y-6 bg-card/60 border border-border/50 p-6 rounded-2xl shadow-sm">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" /> Personal Profile
                    </h3>

                    <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center pt-2">
                        <Avatar className="h-20 w-20 border-2 border-border/50">
                            <AvatarImage src={profile.avatarUrl} />
                            <AvatarFallback className="gradient-bg text-secondary-foreground text-2xl font-bold">
                                {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                            <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                                <Upload className="h-4 w-4" /> Change Avatar
                            </Button>
                            <p className="text-xs text-muted-foreground w-full">JPG, GIF or PNG. 1MB max.</p>
                        </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                value={profile.name}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                placeholder="John Doe"
                                className="rounded-xl border-border/50 bg-background/50 focus-visible:ring-primary/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={profile.email}
                                disabled
                                className="rounded-xl bg-muted/30 border-border/30"
                            />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                value={profile.phone}
                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                placeholder="+1 (555) 000-0000"
                                className="rounded-xl border-border/50 bg-background/50 focus-visible:ring-primary/20"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} disabled={loading} className="gap-2 rounded-xl gradient-bg px-6">
                            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <Save className="h-4 w-4" />}
                            Save Changes
                        </Button>
                    </div>
                </div>

                {/* Theme Settings */}
                <div className="space-y-6 bg-card/60 border border-border/50 p-6 rounded-2xl shadow-sm mb-12">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <Moon className="h-5 w-5 text-primary" /> Appearance
                    </h3>
                    <p className="text-sm text-muted-foreground">Customize the aesthetic of Sonic AI to your liking.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <button
                            onClick={() => setTheme("light")}
                            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 ${theme === 'light' ? 'border-primary bg-primary/5 glow-primary' : 'border-border/50 hover:bg-secondary/50'}`}
                        >
                            <Sun className={`h-6 w-6 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className={`text-sm font-medium ${theme === 'light' ? 'text-foreground' : 'text-muted-foreground'}`}>Light Schema</span>
                        </button>
                        <button
                            onClick={() => setTheme("dark")}
                            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 ${theme === 'dark' ? 'border-primary bg-primary/5 glow-primary' : 'border-border/50 hover:bg-secondary/50'}`}
                        >
                            <Moon className={`h-6 w-6 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-muted-foreground'}`}>Dark Engine</span>
                        </button>
                        <button
                            onClick={() => setTheme("system")}
                            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 ${theme === 'system' ? 'border-primary bg-primary/5 glow-primary' : 'border-border/50 hover:bg-secondary/50'}`}
                        >
                            <Monitor className={`h-6 w-6 ${theme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className={`text-sm font-medium ${theme === 'system' ? 'text-foreground' : 'text-muted-foreground'}`}>System Default</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

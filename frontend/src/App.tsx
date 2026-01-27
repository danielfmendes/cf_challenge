import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Moon, Sun } from "lucide-react";

function App() {
    const [isDark, setIsDark] = useState(false);

    return (
        /* Dynamic theme wrapper using Tailwind's 'dark' class */
        <div className={`${isDark ? "dark" : ""} transition-colors duration-500`}>
            <div className="flex min-h-svh flex-col items-center justify-center bg-zinc-50 p-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">

                {/* 1. Theme Switcher (Portrait-style logic) */}
                <div
                    onClick={() => setIsDark(!isDark)}
                    className="group relative mb-12 cursor-pointer transition-transform active:scale-95"
                >
                    <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl group-hover:bg-primary/40" />
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                        {isDark ? <Sun className="text-amber-400" /> : <Moon className="text-zinc-500" />}
                    </div>
                </div>

                {/* 2. Feature Card (Bento Aesthetic) */}
                <Card className="w-full max-w-md overflow-hidden rounded-[2.5rem] border-zinc-200 bg-white/50 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50">
                    <CardHeader className="space-y-1 pt-8">
                        <div className="flex items-center gap-2 text-primary">
                            <Sparkles size={16} />
                            <span className="text-xs font-bold uppercase tracking-widest">New Project</span>
                        </div>
                        <CardTitle className="text-3xl font-black tracking-tight">Cloudflare Pages</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6 pb-8">
                        <p className="text-zinc-500 dark:text-zinc-400">
                            Your environment is ready. Start building your next-gen
                            application with <strong>React</strong> and <strong>Edge Computing</strong>.
                        </p>

                        <Button
                            className="w-full rounded-xl py-6 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                        >
                            Get Started
                        </Button>
                    </CardContent>
                </Card>

                {/* 3. Footer Attribution */}
                <p className="mt-8 text-sm font-medium text-zinc-400">
                    Powered by <span className="text-zinc-600 dark:text-zinc-200">Vite + Shadcn UI</span>
                </p>
            </div>
        </div>
    );
}

export default App;
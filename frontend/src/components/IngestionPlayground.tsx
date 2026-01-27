import {useState, useEffect} from "react";
import Editor from "@monaco-editor/react";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/components/ui/tabs";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Play, Loader2, CheckCircle2, AlertCircle, Braces, List, RefreshCw, Check, X} from "lucide-react";
import {api} from "@/lib/api";
import {INITIAL_LOAD_JSON, SINGLE_TEMPLATE} from "../../public/template.ts";

export function IngestionPlayground() {
    const [mode, setMode] = useState("single");
    const [jsonInput, setJsonInput] = useState(SINGLE_TEMPLATE);
    const [bulkInput, setBulkInput] = useState(JSON.stringify(INITIAL_LOAD_JSON, null, 2));

    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<any>(null);
    const [progress, setProgress] = useState({current: 0, total: 0});
    const [open, setOpen] = useState(false);
    const [editorTheme, setEditorTheme] = useState("light");
    const [hasUpdates, setHasUpdates] = useState(false);

    useEffect(() => {
        const checkTheme = () => {
            const isDark = document.documentElement.classList.contains("dark");
            setEditorTheme(isDark ? "vs-dark" : "light");
        };
        checkTheme();
        const observer = new MutationObserver((mutations) => mutations.forEach((m) => m.type === "attributes" && checkTheme()));
        observer.observe(document.documentElement, {attributes: true});
        return () => observer.disconnect();
    }, []);

    const notifyUpdate = () => {
        window.dispatchEvent(new Event("feedback-updated"));
    };

    // --- LOGIC: Handle closing & updates ---
    // This function MUST be called to close the dialog if we want the refresh event to fire
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            // Only notify if we are closing AND have successful updates
            if (hasUpdates) {
                notifyUpdate();
            }
        }

        setOpen(isOpen);

        // Reset state only when Opening fresh
        if (isOpen) {
            setResponse(null);
            setProgress({current: 0, total: 0});
            setIsLoading(false);
            setHasUpdates(false);
        }
    };

    const handleReset = () => {
        setResponse(null);
        setProgress({current: 0, total: 0});
        // We do NOT reset hasUpdates here, so if they run 2 batches, both count towards the final refresh
    };

    const handleSimulate = async () => {
        setIsLoading(true);
        setResponse(null);
        setProgress({current: 0, total: 0});

        try {
            if (mode === 'single') {
                const payload = JSON.parse(jsonInput);
                const data = await api.ingest(payload);
                setResponse({type: 'single', ...data});
                setHasUpdates(true); // Mark as updated
            } else {
                const items = JSON.parse(bulkInput);
                if (!Array.isArray(items)) throw new Error("Bulk input must be an array");

                setProgress({current: 0, total: items.length});
                let successCount = 0;

                for (let i = 0; i < items.length; i++) {
                    try {
                        await api.ingest(items[i]);
                        successCount++;
                        setProgress({current: i + 1, total: items.length});
                        setHasUpdates(true); // Mark as updated
                    } catch (e) {
                        console.error("Item failed", e);
                    }
                }
                setResponse({type: 'bulk', count: successCount});
            }
        } catch (error) {
            setResponse({error: "Failed to parse JSON or Network Error"});
        } finally {
            setIsLoading(false);
        }
    };

    const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-dashed hidden md:flex">
                    <Play size={14}/> Simulate / Seed Data
                </Button>
            </DialogTrigger>

            <DialogContent
                className="w-[95vw] max-w-[95vw] md:max-w-4xl lg:max-w-5xl bg-white dark:bg-zinc-950 dark:border-zinc-800 p-4 md:p-6 transition-all duration-200">
                <DialogHeader>
                    <DialogTitle>Ingestion Simulator</DialogTitle>
                    <DialogDescription>Inject fake feedback to test the AI pipeline.</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-2">
                    {/* Controlled Tabs */}
                    <Tabs value={mode} onValueChange={setMode} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="single" className="gap-2"><Braces size={14}/> Single Item</TabsTrigger>
                            <TabsTrigger value="bulk" className="gap-2"><List size={14}/> Bulk Load (Seed)</TabsTrigger>
                        </TabsList>

                        <div
                            className={`transition-opacity duration-300 ${response ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                            <TabsContent value="single" className="space-y-4 m-0">
                                <div
                                    className="h-[300px] md:h-[400px] border rounded-md overflow-hidden dark:border-zinc-800">
                                    <Editor height="100%" defaultLanguage="json" value={jsonInput}
                                            onChange={(val) => setJsonInput(val || "")} theme={editorTheme} options={{
                                        minimap: {enabled: false},
                                        fontSize: 14,
                                        padding: {top: 16, bottom: 16}
                                    }}/>
                                </div>
                            </TabsContent>

                            <TabsContent value="bulk" className="space-y-4 m-0">
                                <div
                                    className="h-[300px] md:h-[400px] border rounded-md overflow-hidden dark:border-zinc-800">
                                    <Editor height="100%" defaultLanguage="json" value={bulkInput}
                                            onChange={(val) => setBulkInput(val || "")} theme={editorTheme} options={{
                                        minimap: {enabled: true},
                                        fontSize: 13,
                                        padding: {top: 16, bottom: 16}
                                    }}/>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>

                    {isLoading && mode === 'bulk' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex justify-between text-xs text-muted-foreground font-medium">
                                <span>Processing...</span>
                                <span>{Math.round(progressPercent)}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-300 ease-out"
                                     style={{width: `${progressPercent}%`}}/>
                            </div>
                        </div>
                    )}

                    {/* Result Area */}
                    {response && (
                        <div
                            className="rounded-lg border bg-zinc-50/50 dark:bg-zinc-900/50 p-4 animate-in zoom-in-95 duration-200">
                            <div className="flex items-start gap-3">
                                {response.error ?
                                    <div
                                        className="mt-0.5 p-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                        <AlertCircle size={18}/>
                                    </div>
                                    :
                                    <div
                                        className="mt-0.5 p-1 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                        <CheckCircle2 size={18}/>
                                    </div>
                                }

                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                            {response.error ? "Ingestion Failed" : "Processing Complete"}
                                        </h4>
                                        {/* FIX: Call handleOpenChange(false) here too */}
                                        <Button size="sm" variant="ghost" onClick={() => handleOpenChange(false)}
                                                className="h-6 w-6 p-0 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full">
                                            <X size={14}/>
                                        </Button>
                                    </div>

                                    {!response.error && response.type === 'single' && response.enriched && (
                                        <div className="text-xs text-muted-foreground">
                                            Identified as <Badge variant="outline"
                                                                 className="mx-1 h-5 px-1.5 text-[10px]">{response.enriched.sentiment}</Badge>
                                            sentiment. Added to dashboard.
                                        </div>
                                    )}

                                    {!response.error && response.type === 'bulk' && (
                                        <p className="text-xs text-muted-foreground">
                                            Successfully ingested <span
                                            className="font-medium text-foreground">{response.count} items</span>. The
                                            dashboard will update when you close this window.
                                        </p>
                                    )}

                                    {response.error && (
                                        <p className="text-xs text-red-600 dark:text-red-400">{response.error}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Footer */}
                    <div className="mt-2 flex gap-3">
                        {!response ? (
                            <Button onClick={handleSimulate} disabled={isLoading}
                                    className="w-full h-11 text-base shadow-sm">
                                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : "Run Simulation"}
                            </Button>
                        ) : (
                            <>
                                <Button variant="outline" onClick={handleReset} className="flex-1 h-11">
                                    <RefreshCw size={14} className="mr-2"/> Run Again
                                </Button>
                                <Button onClick={() => handleOpenChange(false)}
                                        className="flex-1 h-11 bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200">
                                    <Check size={16} className="mr-2"/> Done
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
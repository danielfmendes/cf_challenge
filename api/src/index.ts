import {IngestionWorkflow} from './workflow';

export interface Env {
    AI: any;
    DB: D1Database;
    VECTOR_INDEX: VectorizeIndex;
    INGESTION_WORKFLOW: Workflow;
}

// Helper for standard JSON responses
const jsonResponse = (data: any, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    }
});

export default {
    async fetch(request: Request, env: Env) {
        const url = new URL(request.url);

        // CORS Preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            });
        }

        try {
            // --- POST: INGEST (uses Workflow) ---
            if (request.method === 'POST' && url.pathname === '/api/ingest') {
                const body = await request.json() as any;
                const uniqueId = crypto.randomUUID();

                // Trigger the Workflow
                await env.INGESTION_WORKFLOW.create({
                    id: uniqueId,
                    params: {
                        id: uniqueId,
                        content: body.content,
                        source: body.source || 'Unknown',
                        author: body.author || 'Anon',
                        timestamp: body.timestamp || new Date().toISOString()
                    }
                });

                // Return immediately (Fire & Forget)
                return jsonResponse({success: true, id: uniqueId, status: "queued"});
            }

            if (request.method === 'GET' && url.pathname === '/api/stats') {
                const total = await env.DB.prepare("SELECT COUNT(*) as count FROM feedback").first('count');
                const critical = await env.DB.prepare("SELECT COUNT(*) as count FROM feedback WHERE urgency_score >= 4").first('count');
                const sentiment = await env.DB.prepare("SELECT sentiment_score FROM feedback GROUP BY sentiment_score ORDER BY COUNT(*) DESC LIMIT 1").first();
                return jsonResponse({total, critical, top_sentiment: sentiment?.sentiment_score || 'neutral'});
            }

            if (request.method === 'GET' && url.pathname === '/api/list') {
                const {results} = await env.DB.prepare("SELECT * FROM feedback ORDER BY created_at DESC LIMIT 20").all();
                return jsonResponse(results);
            }

            if (request.method === 'GET' && url.pathname.startsWith('/api/issue/')) {
                const id = url.pathname.split('/').pop();
                const item = await env.DB.prepare("SELECT * FROM feedback WHERE id = ?").bind(id).first();
                return item ? jsonResponse(item) : jsonResponse({error: "Not Found"}, 404);
            }

            if (request.method === 'GET' && url.pathname === '/api/charts') {
                const {results} = await env.DB.prepare("SELECT sentiment_score, COUNT(*) as count FROM feedback GROUP BY sentiment_score").all();
                return jsonResponse(results);
            }

            return jsonResponse({error: "Not Found"}, 404);

        } catch (e: any) {
            return jsonResponse({error: e.message}, 500);
        }
    }
};

export {IngestionWorkflow};
import {Ai} from '@cloudflare/ai';

export interface Env {
    AI: any;
    DB: D1Database;
    VECTOR_INDEX: VectorizeIndex;
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

// Helper: AI Processing & DB Insertion
async function processFeedbackItem(env: Env, body: any) {
    const ai = new Ai(env.AI);
    const uniqueId = crypto.randomUUID();

    // 1. Run AI Analysis & Embedding in parallel
    const [analysis, embedding] = await Promise.all([
        ai.run('@cf/meta/llama-3.1-8b-instruct' as any, {
            messages: [{
                role: 'system',
                content: `Analyze feedback. Return JSON ONLY.
                Fields:
                - sentiment: "positive" | "negative" | "neutral"
                - urgency: 1-5 (5 is critical)
                - summary: 1 sentence summary
                - root_cause: Technical explanation
                - suggested_fix: Git command or code fix`
            }, {
                role: 'user',
                content: `Feedback: "${body.content}"`
            }]
        }),
        ai.run('@cf/baai/bge-base-en-v1.5', {text: [body.content]})
    ]);

    // 2. Safe Parse AI Response
    let data;
    try {
        const raw = (analysis as any).response.replace(/```json|```/g, '').trim();
        data = JSON.parse(raw);
    } catch {
        data = {sentiment: "neutral", urgency: 1, summary: "Processing error", root_cause: "N/A", suggested_fix: "N/A"};
    }

    // 3. Insert into D1
    await env.DB.prepare(
        `INSERT INTO feedback (id, content, source, author, original_timestamp, sentiment_score, urgency_score, summary,
                               root_cause, suggested_fix)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        uniqueId, body.content, body.source || 'Unknown', body.author || 'Anon',
        body.timestamp || new Date().toISOString(), data.sentiment, data.urgency, data.summary,
        data.root_cause, data.suggested_fix
    ).run();

    // 4. Insert into Vectorize
    await env.VECTOR_INDEX.insert([{
        id: uniqueId,
        values: embedding.data[0],
        metadata: {urgency: data.urgency}
    }]);

    return uniqueId;
}

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
            // --- POST: INGEST SINGLE ---
            if (request.method === 'POST' && url.pathname === '/api/ingest') {
                const body = await request.json();
                const id = await processFeedbackItem(env, body);
                return jsonResponse({success: true, id});
            }

            // --- GET: STATS ---
            if (request.method === 'GET' && url.pathname === '/api/stats') {
                const total = await env.DB.prepare("SELECT COUNT(*) as count FROM feedback").first('count');
                const critical = await env.DB.prepare("SELECT COUNT(*) as count FROM feedback WHERE urgency_score >= 4").first('count');
                const sentiment = await env.DB.prepare("SELECT sentiment_score FROM feedback GROUP BY sentiment_score ORDER BY COUNT(*) DESC LIMIT 1").first();
                return jsonResponse({total, critical, top_sentiment: sentiment?.sentiment_score || 'neutral'});
            }

            // --- GET: LIST ---
            if (request.method === 'GET' && url.pathname === '/api/list') {
                const {results} = await env.DB.prepare("SELECT * FROM feedback ORDER BY created_at DESC LIMIT 20").all();
                return jsonResponse(results);
            }

            // --- GET: DETAILS ---
            if (request.method === 'GET' && url.pathname.startsWith('/api/issue/')) {
                const id = url.pathname.split('/').pop();
                const item = await env.DB.prepare("SELECT * FROM feedback WHERE id = ?").bind(id).first();
                return item ? jsonResponse(item) : jsonResponse({error: "Not Found"}, 404);
            }

            // --- GET: CHARTS ---
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
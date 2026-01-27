const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export interface FeedbackItem {
    id: string;
    content: string;
    source: string;
    author: string;
    original_timestamp: string;
    created_at: string;
    sentiment_score: 'positive' | 'negative' | 'neutral';
    urgency_score: number;
    summary: string;
    root_cause: string;
    suggested_fix: string;
}

export interface DashboardStats {
    total: number;
    critical: number;
    top_sentiment: string;
}

export interface ChartDataPoint {
    sentiment_score: string;
    count: number;
}

// Generic helper to reduce boilerplate
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            headers: {'Content-Type': 'application/json'},
            ...options,
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e) {
        console.error(`Request failed for ${endpoint}:`, e);
        // Return null or empty array based on context in a real app,
        // but for now re-throwing or returning default values handled by caller logic
        throw e;
    }
}

export const api = {
    // 1. Ingestion
    ingest: (payload: any) =>
        request<{ success: boolean; id: string }>('/ingest', {
            method: 'POST', body: JSON.stringify(payload)
        }),

    // 2. Data Retrieval
    getStats: async (): Promise<DashboardStats> => {
        try {
            return await request<DashboardStats>('/stats');
        } catch {
            return {total: 0, critical: 0, top_sentiment: '-'};
        }
    },

    getList: async (): Promise<FeedbackItem[]> => {
        try {
            return await request<FeedbackItem[]>('/list');
        } catch {
            return [];
        }
    },

    getDetail: async (id: string): Promise<FeedbackItem | null> => {
        try {
            return await request<FeedbackItem>(`/issue/${id}`);
        } catch {
            return null;
        }
    },

    getCharts: async (): Promise<ChartDataPoint[]> => {
        try {
            return await request<ChartDataPoint[]>('/charts');
        } catch {
            return [];
        }
    }
};
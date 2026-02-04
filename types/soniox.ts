export interface SonioxToken {
    text: string;
    start_ms: number;
    end_ms: number;
    confidence: number;
    is_final: boolean;
    speaker: string;
}

export interface SonioxResponse {
    tokens: SonioxToken[];
    final_audio_proc_ms?: number;
    total_audio_proc_ms?: number;
    error_code?: number;
    error_message?: string;
}

export interface SonioxConfig {
    api_key: string;
    model: string;
    audio_format: string;
    language_hints?: string[];
    context?: {
        general?: Array<{ key: string; value: string }>;
        text?: string;
        terms?: string[];
        translation_terms?: Array<{ source: string; target: string }>;
    };
    enable_speaker_diarization?: boolean;
    enable_language_identification?: boolean;
    translation?: {
        type: string;
        language_a: string;
        language_b: string;
    };
}

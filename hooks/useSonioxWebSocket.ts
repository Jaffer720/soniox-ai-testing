"use client"

import { useState, useCallback, useRef } from 'react'
import { SonioxConfig, SonioxResponse, SonioxToken } from '@/types/soniox'

export function useSonioxWebSocket() {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [interimTranscript, setInterimTranscript] = useState('')
    const [error, setError] = useState<string | null>(null)

    const websocketRef = useRef<WebSocket | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

    const stopListening = useCallback(() => {
        setIsListening(false)

        // Stop recorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
        }

        // Stop tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }

        // Close AudioContext
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(console.error)
            audioContextRef.current = null
        }

        // Close WebSocket
        if (websocketRef.current) {
            // Send empty frame to indicate end of stream as per docs
            if (websocketRef.current.readyState === WebSocket.OPEN) {
                try {
                    websocketRef.current.send(new Uint8Array(0))
                } catch (e) {
                    console.error("Error sending closing frame", e)
                }
                websocketRef.current.close()
            }
            websocketRef.current = null
        }
    }, [])

    const startListening = useCallback(async (config: Partial<SonioxConfig> = {}) => {
        try {
            setError(null)
            const apiKey = process.env.NEXT_PUBLIC_SONIOX_API_KEY || config.api_key;

            if (!apiKey) {
                throw new Error("Soniox API Key is missing")
            }

            // Initialize WebSocket
            const ws = new WebSocket('wss://stt-rt.soniox.com/transcribe-websocket')
            websocketRef.current = ws

            ws.onopen = () => {
                console.log("Connected to Soniox")

                // Send Configuration
                const initialConfig: SonioxConfig = {
                    api_key: apiKey,
                    model: "stt-rt-preview",
                    audio_format: "auto", // Let server detect codec (we send WebM/Opus via MediaRecorder)
                    language_hints: ["en"],
                    enable_speaker_diarization: true,
                    ...config
                }

                ws.send(JSON.stringify(initialConfig))
                setIsListening(true)
            }

            ws.onmessage = (event) => {
                try {
                    const response: SonioxResponse = JSON.parse(event.data)

                    if (response.error_code) {
                        setError(`Error ${response.error_code}: ${response.error_message}`)
                        stopListening()
                        return
                    }

                    if (response.tokens) {
                        // Basic accumulation logic - this can be improved based on is_final
                        // For simplicity, we assume generic real-time stream handling

                        // Filter final vs interim
                        const finalTokens = response.tokens.filter(t => t.is_final).map(t => t.text).join(' ')
                        const interimTokens = response.tokens.filter(t => !t.is_final).map(t => t.text).join(' ')

                        setTranscript(prev => {
                            if (finalTokens) {
                                return prev ? `${prev} ${finalTokens}` : finalTokens
                            }
                            return prev
                        })

                        // For interim, we just replace the current interim state
                        setInterimTranscript(interimTokens)
                    }

                } catch (e) {
                    console.error("Error parsing response", e)
                }
            }

            ws.onerror = (e) => {
                console.error("WebSocket error", e)
                setError("Connection error")
                stopListening()
            }

            ws.onclose = () => {
                console.log("Soniox connection closed")
                setIsListening(false)
            }

            // Setup Audio
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream

            const audioContext = new AudioContext({ sampleRate: 16000 }) // Soniox prefers 16kHz usually, or auto. Explicit 16k is safer if supported.
            audioContextRef.current = audioContext

            const source = audioContext.createMediaStreamSource(stream)
            // Use ScriptProcessor for raw data access (simpler for basic demo than AudioWorklet, though deprecated)
            // Or better: AudioWorklet. For this rapid prototype, ScriptProcessor is accessible.
            // However, MediaRecorder is easier but gives containerized chunks (WebM). 
            // Soniox supports "auto" audio_format, but raw PCM is often cleaner.
            // Let's try MediaRecorder first with mimeType settings if possible, or raw if required.
            // The docs say "Send audio as binary WebSocket frames".
            // Docs also say "audio_format": "auto"
            // If we send WebM blobs, 'auto' might pick it up. Let's try sending standard Blob data.

            // Update: User prompt example says "audio_format": "auto". 
            // Let's use MediaRecorder for simplicity as it handles streaming efficiently.

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm'

            const mediaRecorder = new MediaRecorder(stream, { mimeType })
            mediaRecorderRef.current = mediaRecorder

            mediaRecorder.ondataavailable = async (e) => {
                if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                    // Send blob directly
                    // We might need to ensure the WS config knows it's WebM/Opus if we use 'auto'
                    ws.send(e.data)
                }
            }

            mediaRecorder.start(100) // 100ms chunks

        } catch (err: any) {
            setError(err.message || "Failed to start listening")
            stopListening()
        }
    }, [stopListening])

    const resetTranscript = useCallback(() => {
        setTranscript('')
        setInterimTranscript('')
    }, [])

    return {
        isListening,
        transcript,
        interimTranscript,
        error,
        startListening,
        stopListening,
        resetTranscript
    }
}

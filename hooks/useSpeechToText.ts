"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

export interface SpeechToTextOptions {
    interimResults?: boolean
    continuous?: boolean
    lang?: string
}

export function useSpeechToText(options: SpeechToTextOptions = {}) {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [interimTranscript, setInterimTranscript] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [config, setConfig] = useState(options)

    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition()
                recognition.continuous = config.continuous ?? true
                recognition.interimResults = config.interimResults ?? true
                recognition.lang = config.lang || 'en-US'

                recognition.onstart = () => {
                    setIsListening(true)
                    setError(null)
                }

                recognition.onend = () => {
                    setIsListening(false)
                }

                recognition.onerror = (event: any) => {
                    setError(event.error)
                    setIsListening(false)
                }

                recognition.onresult = (event: any) => {
                    let final = ''
                    let interim = ''

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            final += event.results[i][0].transcript
                        } else {
                            interim += event.results[i][0].transcript
                        }
                    }

                    if (final) {
                        setTranscript(prev => {
                            const newTranscript = prev ? `${prev} ${final}` : final
                            return newTranscript
                        })
                    }
                    setInterimTranscript(interim)
                }

                recognitionRef.current = recognition
            } else {
                setError('Browser does not support Speech Recognition')
            }
        }
    }, [config.lang, config.continuous, config.interimResults])

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start()
            } catch (e) {
                console.error("Start error:", e)
            }
        }
    }, [isListening])

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop()
        }
    }, [isListening])

    const resetTranscript = useCallback(() => {
        setTranscript('')
        setInterimTranscript('')
    }, [])

    const setLanguage = useCallback((lang: string) => {
        setConfig(prev => ({ ...prev, lang }))
        // If listening, we might need to restart? For now, we rely on the effect.
        // The effect will recreate the recognition instance.
        // User should stop before switching technically, but this works.
    }, [])

    return {
        isListening,
        transcript,
        interimTranscript,
        error,
        startListening,
        stopListening,
        resetTranscript,
        setLanguage,
        language: config.lang || 'en-US',
    }
}

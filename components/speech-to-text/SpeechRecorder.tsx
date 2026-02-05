"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PiMicrophoneFill,
  PiStopFill,
  PiCopy,
  PiTrash,
  PiTranslate,
} from "react-icons/pi";
import useSonioxClient from "@/hooks/useSonioxClient";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "auto", name: "Auto Detect" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "hi", name: "Hindi" },
];

export function SpeechRecorder() {
  const [mounted, setMounted] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("auto");

  // Soniox SDK Hook
  const {
    state,
    setState,
    finalTokens,
    nonFinalTokens,
    error,
    startTranscription,
    stopTranscription,
    reset,
  } = useSonioxClient({
    apiKey: process.env.NEXT_PUBLIC_SONIOX_API_KEY || "",
    language: selectedLanguage,
  });

  const transcript = finalTokens.map((t) => t.text).join("");
  const interimTranscript = nonFinalTokens.map((t) => t.text).join("");
  const isListening = !["Init", "RequestingMedia", "OpeningWebSocket", "Running", "FinishingProcessing", "Finished", "Error", "Canceled"].includes(
    state,
  );

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript, interimTranscript]);

  const handleCopy = () => {
    // Only copy if there's text
    const textToCopy = transcript || interimTranscript;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
    }
  };

  const handleStart = async () => {
    try {
        setState("Init");
      await startTranscription();
    } catch (e) {
      console.error("Failed to start transcription", e);
    }
  };

  const handleClear = () => {
    try {
      // Stop any active transcription and clear displayed text
      stopTranscription();
      reset();
    } catch (e) {
      console.error("Error stopping transcription while clearing", e);
    }
  };

  if (!mounted) return null;

  return (
    <Card className="w-full max-w-4xl mx-auto overflow-hidden border-0 shadow-2xl bg-card/95 backdrop-blur-xl ring-1 ring-border rounded-3xl transition-all duration-300">
      <CardContent className="p-0 min-h-100 flex flex-col relative h-125">
        {/* Header / Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 bg-linear-to-b from-background/90 to-transparent pointer-events-none">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 pointer-events-auto">
            <PiTranslate className="w-6 h-6 text-primary" />
            Live Transcription
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground ml-2">
              Soniox AI
            </span>
          </h2>
          <div className="flex items-center gap-2 pointer-events-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground"
              title="Copy Text"
            >
              <PiCopy className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Clear"
            >
              <PiTrash className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Text Display Area */}
        <div className="flex-1 p-8 pt-24 overflow-y-auto font-medium text-lg leading-relaxed text-foreground">
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20">
              Error: {error.message ? error.message : JSON.stringify(error)}
            </div>
          )}

          {!transcript && !interimTranscript ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground animate-pulse">
              <PiMicrophoneFill className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-xl font-light">Try it. Speak naturally.</p>
              <p className="text-sm opacity-60 mt-2">
                Using Soniox AI Real-time API
              </p>
            </div>
          ) : (
            <div className="whitespace-pre-wrap wrap-break-words">
              {transcript}
              <span className="text-primary">{interimTranscript}</span>
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Bottom Controls Bar */}
        <div className="p-6 bg-muted/30 border-t border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Select
              value={selectedLanguage}
              onValueChange={setSelectedLanguage}
              disabled={isListening}
            >
              <SelectTrigger className="w-50 bg-background border-input rounded-xl shadow-sm hover:border-primary transition-colors focus:ring-primary disabled:opacity-50">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem
                    key={lang.code}
                    value={lang.code}
                    className="cursor-pointer"
                  >
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={isListening ? stopTranscription : handleStart}
            variant={isListening ? "destructive" : "default"}
            className={cn(
              "rounded-full px-8 py-6 text-lg font-medium shadow-lg transition-all duration-300 transform active:scale-95 group",
              isListening && "animate-pulse",
            )}
          >
            {isListening ? (
              <>
                <PiStopFill className="w-6 h-6 mr-2 animate-bounce" />
                Stop Listening
              </>
            ) : (
              <>
                <PiMicrophoneFill className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />
                Start Talking
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

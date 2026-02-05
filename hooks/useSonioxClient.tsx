import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ErrorStatus,
  RecorderState,
  Token,
  TranslationConfig,
} from "@soniox/speech-to-text-web";

interface UseSonioxClientOptions {
  apiKey: string;
  language?: string;
  translationConfig?: TranslationConfig;
  onStarted?: () => void;
  onFinished?: () => void;
}

type TranscriptionError = {
  status: ErrorStatus;
  message: string;
  errorCode: number | undefined;
};

// useTranscribe hook wraps Soniox speech-to-text-web SDK.
export default function useSonioxClient({
  apiKey,
  language,
  translationConfig,
  onStarted,
  onFinished,
}: UseSonioxClientOptions) {
  const sonioxClient = useRef<any | null>(null);

  // Lazily import SonioxClient only in browser runtime to avoid SSR/window issues
  const ensureClient = useCallback(async () => {
    if (sonioxClient.current) return sonioxClient.current;
    if (typeof window === "undefined") return null;
    const mod = await import("@soniox/speech-to-text-web");
    const Client = mod.SonioxClient;
    sonioxClient.current = new Client({ apiKey: apiKey });
    return sonioxClient.current;
  }, [apiKey]);

  const [state, setState] = useState<RecorderState>("Init");
  const [finalTokens, setFinalTokens] = useState<Token[]>([]);
  const [nonFinalTokens, setNonFinalTokens] = useState<Token[]>([]);
  const [error, setError] = useState<TranscriptionError | null>(null);

  const startTranscription = useCallback(async () => {
    setState('Running')
    setFinalTokens([]);
    setNonFinalTokens([]);
    setError(null);
    // Ensure the SDK client is initialized in the browser
    const client = await ensureClient();
    if (!client) {
      setError({ status: "Unknown" as ErrorStatus, message: "Client initialization failed", errorCode: undefined });
      return;
    }

    const config: any = {
      model: "stt-rt-v3",
      languageHints : ["en"], 
      enableSpeakerDiarization: true,
      enableEndpointDetection: false,
      translation: translationConfig || undefined,
      onFinished: onFinished,
      onStarted: onStarted,
      onError: (
        status: ErrorStatus,
        message: string,
        errorCode: number | undefined,
      ) => {
        setState("Error");
        setError({ status, message, errorCode });
      },
      onStateChange: ({ newState }: { newState: RecorderState }) => {
        setState(newState);
      },
      onPartialResult(result: { tokens: Token[] }) {
        const newFinalTokens: Token[] = [];
        const newNonFinalTokens: Token[] = [];

        for (const token of result.tokens) {
          if (token.is_final) {
            newFinalTokens.push(token);
          } else {
            newNonFinalTokens.push(token);
          }
        }

        setFinalTokens((previousTokens) => [
          ...previousTokens,
          ...newFinalTokens,
        ]);
        setNonFinalTokens(newNonFinalTokens);
      },
    };

    if (language && language !== "auto") {
      config.language = language;
      config.enableLanguageIdentification = false;
    } else {
      config.enableLanguageIdentification = true;
    }

    client.start(config);
  }, [onFinished, onStarted, translationConfig, ensureClient, language]);

  const stopTranscription = useCallback(() => {
    setState("FinishingProcessing");
    sonioxClient.current?.stop();
    setState("Finished");
  }, []);

  const reset = useCallback(() => {
    setState("Init");
    setFinalTokens([]);
    setNonFinalTokens([]);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      setState("Canceled");
      sonioxClient.current?.cancel();
    };
  }, []);

  return {
    startTranscription,
    stopTranscription,
    reset,
    state,
    setState,
    finalTokens,
    nonFinalTokens,
    error,
  };
}

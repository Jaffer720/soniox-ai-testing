import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ErrorStatus,
  RecorderState,
  Token,
  TranslationConfig,
} from "@soniox/speech-to-text-web";

interface UseSonioxClientOptions {
  apiKey: string | undefined;
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
    setFinalTokens([]);
    setNonFinalTokens([]);
    setError(null);
    // Ensure the SDK client is initialized in the browser
    const client = await ensureClient();
    if (!client) {
      setError({ status: "Unknown" as ErrorStatus, message: "Client initialization failed", errorCode: undefined });
      return;
    }

    // First message we send contains configuration. Here we set if we
    // are transcribing or translating. For translation we also set if it is
    // one-way or two-way.
    client.start({
      model: "stt-rt-v3",
      enableLanguageIdentification: true,
      enableSpeakerDiarization: true,
      enableEndpointDetection: true,
      translation: translationConfig || undefined,

      onFinished: onFinished,
      onStarted: onStarted,

      onError: (
        status: ErrorStatus,
        message: string,
        errorCode: number | undefined,
      ) => {
        setError({ status, message, errorCode });
      },

      onStateChange: ({ newState }: { newState: RecorderState }) => {
        setState(newState);
      },

      // When we receive some tokens back, sort them based on their status --
      // is it final or non-final token.
      onPartialResult({result}: { result: { tokens: Token[] } }) {
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
    });
  }, [onFinished, onStarted, translationConfig, ensureClient]);

  const stopTranscription = useCallback(() => {
    sonioxClient.current?.stop();
  }, []);

  useEffect(() => {
    return () => {
      sonioxClient.current?.cancel();
    };
  }, []);

  return {
    startTranscription,
    stopTranscription,
    state,
    finalTokens,
    nonFinalTokens,
    error,
  };
}

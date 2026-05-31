import { useState, useRef, useCallback } from "react";

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SR;
    webkitSpeechRecognition?: new () => SR;
  }
}

interface UseSpeechInputOptions {
  lang?: string;
  onTranscript: (text: string) => void;
}

export function useSpeechInput({ lang = "ar-JO", onTranscript }: UseSpeechInputOptions) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SR | null>(null);
  const accumulatedRef = useRef<string>("");

  const SpeechRecognitionAPI =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;

  const isSupported = !!SpeechRecognitionAPI;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText("");
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError("المتصفح لا يدعم التعرف على الصوت");
      return;
    }
    setError(null);
    accumulatedRef.current = "";

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang;
    recognition.continuous = true;      // keep listening after each pause
    recognition.interimResults = true;  // show partial results live

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          accumulatedRef.current += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimText(accumulatedRef.current + interim);
    };

    recognition.onerror = (ev: any) => {
      // 'no-speech' is not a real error — user just paused
      if (ev.error !== "no-speech") {
        setError("تعذّر التعرف على الصوت");
        setIsListening(false);
      }
    };

    // continuous mode means onend fires when stop() is explicitly called
    recognition.onend = () => {
      // If we still have accumulated text, send it
      const final = accumulatedRef.current.trim();
      if (final) {
        onTranscript(final);
      }
      accumulatedRef.current = "";
      setInterimText("");
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [SpeechRecognitionAPI, lang, onTranscript]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();        // stop() → triggers onend → sends accumulated text
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return { isListening, interimText, error, isSupported, toggle, stop };
}

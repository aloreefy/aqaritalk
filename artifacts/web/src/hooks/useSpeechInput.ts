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
  const finalTextRef = useRef<string>("");
  const stoppedManuallyRef = useRef(false);

  const SpeechRecognitionAPI =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;

  const isSupported = !!SpeechRecognitionAPI;

  const stop = useCallback(() => {
    stoppedManuallyRef.current = true;
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
    finalTextRef.current = "";
    stoppedManuallyRef.current = false;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang;
    // continuous=false: one utterance per activation — avoids Android duplicate-result bug.
    // Android Chrome ignores continuous=true and fires onend after each pause anyway,
    // leading to repeated final results when the session is restarted automatically.
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          // Append only genuinely new final text (avoid Android double-final bug).
          const newText = result[0].transcript;
          if (!finalTextRef.current.endsWith(newText)) {
            finalTextRef.current += newText;
          }
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimText(finalTextRef.current + interim);
    };

    recognition.onerror = (ev: any) => {
      if (ev.error === "no-speech") return; // user paused — not a real error
      if (ev.error === "aborted") return;   // user stopped manually
      setError("تعذّر التعرف على الصوت");
      setIsListening(false);
    };

    recognition.onend = () => {
      const final = finalTextRef.current.trim();
      if (final && !stoppedManuallyRef.current) {
        onTranscript(final);
      } else if (final && stoppedManuallyRef.current) {
        // Still send if user stopped after speaking
        onTranscript(final);
      }
      finalTextRef.current = "";
      setInterimText("");
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [SpeechRecognitionAPI, lang, onTranscript]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return { isListening, interimText, error, isSupported, toggle, stop };
}

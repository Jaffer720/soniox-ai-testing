
import { SpeechRecorder } from "@/components/speech-to-text/SpeechRecorder";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-background">
      {/* Background decorations - using theme vars */}
      <div className="absolute inset-0 bg-grid-white/[0.05] dark:bg-grid-white/[0.05] bg-[size:40px_40px] pointer-events-none opacity-20 text-muted-foreground" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-chart-1/20 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-chart-2/20 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 translate-y-1/2" />

      <div className="w-full max-w-5xl mx-auto z-10 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground drop-shadow-sm">
            Sonix Flow
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
            Seamlessly caption your thoughts. Instant, accurate, and secure speech-to-text directly in your browser.
          </p>
        </div>

        <SpeechRecorder />

        <div className="text-center text-muted-foreground/60 text-sm">
          <p>Powered by Soniox AI • Privacy Focused</p>
        </div>
      </div>
    </main>
  );
}

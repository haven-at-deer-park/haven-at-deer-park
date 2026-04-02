'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Volume2, VolumeX, Instagram, Facebook, Youtube } from 'lucide-react';

const UGC_VIDEOS = [
  { id: 1, src: '/vids/ugc-1.mp4' },
  { id: 2, src: '/vids/ugc-2.mp4' },
  { id: 3, src: '/vids/ugc-3.mp4' }
];

function VideoCard({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Sync state if video pauses naturally or out-of-bounds
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    video.addEventListener('pause', handlePause);
    video.addEventListener('play', handlePlay);

    return () => {
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('play', handlePlay);
    };
  }, []);

  return (
    <div 
      className="relative aspect-[9/16] bg-black/5 rounded-2xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-xl transition-all duration-300"
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        loop
        playsInline
        muted={isMuted}
      />
      
      {/* Play Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center border border-white/50 shadow-2xl">
            <Play className="w-8 h-8 text-white ml-1 shadow-sm" />
          </div>
        </div>
      )}

      {/* Mute Toggle */}
      <button
        onClick={toggleMute}
        className="absolute bottom-4 right-4 p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white/90 hover:bg-black/60 transition-colors z-10 border border-white/10"
        aria-label={isMuted ? "Unmute video" : "Mute video"}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>

      {/* Brand Badge */}
      <div className="absolute top-4 left-4 inline-flex items-center px-3 py-1.5 rounded-full bg-primary/90 text-primary-foreground text-xs font-semibold tracking-wider uppercase shadow-md backdrop-blur-md">
        Real Guest
      </div>
    </div>
  );
}

export default function UgcGallery() {
  return (
    <section className="section bg-card/60 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sea-light/30 dark:bg-sea-dark/30 rounded-full blur-3xl" />
      
      <div className="container relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16 animate-fade-in">
          <span className="text-sm text-primary font-bold uppercase tracking-widest">
            Guest Experiences
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold mt-3 mb-6 tracking-tight">
            See it to believe it
          </h2>
          <p className="text-muted-foreground text-lg">
            Don't just take our word for it. Watch real moments captured by guests enjoying their stay at The Haven at Deer Park.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {UGC_VIDEOS.map((video, idx) => (
            <div 
              key={video.id} 
              className="animate-fade-in"
              style={{ animationDelay: `${(idx + 1) * 150}ms` }}
            >
              <VideoCard src={video.src} />
            </div>
          ))}
        </div>

        {/* Social Banners */}
        <div className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto animate-fade-in [animation-delay:600ms]">
          <a href="https://www.instagram.com/havenatdeerpark/" target="_blank" rel="noopener noreferrer" 
             className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-[2px] transition-transform hover:scale-[1.05] shadow-lg">
            <div className="flex flex-col items-center text-center justify-center gap-3 rounded-2xl bg-white/95 px-4 py-8 dark:bg-zinc-900/95 backdrop-blur-xl h-full">
              <div className="rounded-full bg-pink-100 p-4 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400 group-hover:scale-110 transition-transform mb-2">
                <Instagram className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-base md:text-lg dark:text-white">Follow IG</h4>
            </div>
          </a>
          
          <a href="https://www.tiktok.com/@HavenatDeerPark" target="_blank" rel="noopener noreferrer" 
             className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-black to-zinc-600 dark:from-white dark:to-zinc-300 p-[2px] transition-transform hover:scale-[1.05] shadow-lg">
            <div className="flex flex-col items-center text-center justify-center gap-3 rounded-2xl bg-white/95 px-4 py-8 dark:bg-zinc-900/95 backdrop-blur-xl h-full">
              <div className="rounded-full bg-zinc-100 p-4 text-zinc-900 dark:bg-zinc-800 dark:text-white group-hover:scale-110 transition-transform mb-2">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.16-3.44-3.37-3.46-5.7-.02-3.33 2.61-6.23 5.9-6.48l.01 4c-1.05.08-2.1.8-2.45 1.77-.41.97-.04 2.11.83 2.73.91.63 2.22.61 3.12-.05.9-.66 1.34-1.74 1.34-2.81V.02z"/>
                </svg>
              </div>
              <h4 className="font-bold text-base md:text-lg dark:text-white">Watch TikTok</h4>
            </div>
          </a>

          <a href="https://www.facebook.com/havenatdeerpark" target="_blank" rel="noopener noreferrer" 
             className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 to-blue-400 p-[2px] transition-transform hover:scale-[1.05] shadow-lg">
            <div className="flex flex-col items-center text-center justify-center gap-3 rounded-2xl bg-white/95 px-4 py-8 dark:bg-zinc-900/95 backdrop-blur-xl h-full">
              <div className="rounded-full bg-blue-100 p-4 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 group-hover:scale-110 transition-transform mb-2">
                <Facebook className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-base md:text-lg dark:text-white">Like on Facebook</h4>
            </div>
          </a>

          <a href="https://www.youtube.com/@HavenatDeerPark" target="_blank" rel="noopener noreferrer" 
             className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 to-red-400 p-[2px] transition-transform hover:scale-[1.05] shadow-lg">
            <div className="flex flex-col items-center text-center justify-center gap-3 rounded-2xl bg-white/95 px-4 py-8 dark:bg-zinc-900/95 backdrop-blur-xl h-full">
              <div className="rounded-full bg-red-100 p-4 text-red-600 dark:bg-red-900/40 dark:text-red-400 group-hover:scale-110 transition-transform mb-2">
                <Youtube className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-base md:text-lg dark:text-white">Subscribe on YT</h4>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import VRScene from './VRScene';
import PortalHUD from './PortalHUD';
import AnalyzePanel from './Analyze';
import Directory from './Directory';
import Chatbot from './Chatbot';
import LearnPanel from './Learn';
import Form from './MintForm'; // Use NFTPD's MintForm for 'Buy'
import Blacklist from './Blacklist';
import Mythology from './Mythology';

// TUC Sound Logic integration (kept simple inside VRbg for now or use PortalHUD's separation?)
// TUC has Sound Logic in VRbg (lines 78-99). NFTPD has it in VRbg (lines 38-46).
// We will adapt the TUC structure but use NFTPD sound assets if desired, or TUC's 'TheGameOfLife.mp3'.
// NFTPD used 'sax.mp3'. Let's stick to 'sax.mp3' for NFTPD identity but use TUC's clean logic.

export default function VRBackground() {
  const [currentView, setCurrentView] = useState('Diamond Viewer'); // Start with Net view
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Scene State (for VRScene prop drift)
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(0.1);
  const [visualMode, setVisualMode] = useState<'normal' | 'heat' | 'age'>('normal');
  const [gridResetTrigger, setGridResetTrigger] = useState(0);

  // Chatbot State
  const [messages, setMessages] = useState<{ sender: 'user' | 'assistant'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [optionsVisible, setOptionsVisible] = useState(true);

  // Initialize Audio
  useEffect(() => {
    // Using NFTPD's sax.mp3
    audioRef.current = new Audio('/sax.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'Diamond Viewer': // NET
        return <AnalyzePanel />;
      case 'Chat':
        return (
          <div className="absolute inset-x-0 top-0 bottom-[120px] flex items-center justify-center px-4 pt-28 pointer-events-none">
            <div className="w-full h-full max-w-5xl pointer-events-auto">
              <Chatbot
                messages={messages}
                setMessages={setMessages}
                input={input}
                setInput={setInput}
                optionsVisible={optionsVisible}
                setOptionsVisible={setOptionsVisible}
              />
            </div>
          </div>
        );
      case 'Directory':
        return (
          <div className="absolute inset-x-0 top-0 bottom-[120px] flex items-center justify-center px-4 pt-28 pointer-events-none">
            <div className="w-full h-full max-w-[98vw] overflow-hidden pointer-events-auto">
              {/* Directory handles its own sizing effectively, but container helps */}
              <Directory />
            </div>
          </div>
        );
      case 'Learn':
        return (
          <div className="absolute inset-x-0 top-0 bottom-[120px] flex items-center justify-center px-4 pt-28 pointer-events-none">
            <div className="w-full h-full max-w-5xl overflow-auto pointer-events-auto bg-[#050a14]/90 backdrop-blur-md rounded-xl border border-white/20 p-4 shadow-2xl">
              {/* Wrapped in a styled container for consistency if LearnPanel lacks it */}
              <LearnPanel />
            </div>
          </div>
        );
      case 'Buy':
        return (
          <div className="absolute inset-x-0 top-0 bottom-[120px] flex items-center justify-center px-4 pt-28 pointer-events-none">
            <div className="w-full h-full max-w-4xl overflow-auto pointer-events-auto bg-[#050a14]/90 backdrop-blur-md rounded-xl border border-white/20 p-4 shadow-2xl">
              <Form />
            </div>
          </div>
        );
      case 'Blacklist':
        return (
          <div className="absolute inset-x-0 top-0 bottom-[120px] flex items-center justify-center px-4 pt-28 pointer-events-none">
            <div className="w-full h-full max-w-[95vw] overflow-hidden pointer-events-auto relative rounded-xl border border-white/20 shadow-2xl">
              <Blacklist />
            </div>
          </div>
        );
      case 'Mythology':
        return (
          <div className="absolute inset-0 z-[1500] pointer-events-auto bg-black">
            <Mythology />
            {/* Close button for Mythology if needed, or rely on HUD navigation to switch away which works via React state */}
          </div>
        );
      default:
        // Even if empty, show nothing
        return null;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white">
      {/* HUD Navigation */}
      <PortalHUD
        onNavigate={(view) => {
          if (currentView === view) {
            // Optional: toggle off or refresh? TUC toggles off in HUD logic? 
            // TUC's PortalHUD calls onNavigate. VRbg handles state.
            // If clicking active, maybe keep it or refresh. 
            // TUC VRbg: if currentView === view -> setCurrentView('')
            setCurrentView('');
          } else {
            setCurrentView(view);
          }
        }}
        currentView={currentView}
      />

      {/* Music Control (Bottom Right or elsewhere - adaptable) */}
      <button
        onClick={toggleMusic}
        className="fixed z-[2000] rounded-full transition-all duration-300 hover:scale-110 pointer-events-auto
          bottom-4 right-4 p-2 md:bottom-8 md:right-8 md:p-3"
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
        title="Toggle Music"
      >
        {isPlaying ? (
          <div className="animate-pulse text-white">🔊</div> // Simple icon or svg
        ) : (
          <div className="text-white/50">🔇</div>
        )}
      </button>

      {/* VR Scene Background */}
      <div className="absolute inset-0 z-0 select-none">
        <VRScene
          onLoad={() => setIsLoaded(true)}
        // Pass props if VRScene supports them (NFTPD VRScene might differ from TUC)
        // NFTPD VRScene (Step 113) takes `onLoad`.
        // If we want params like speed/visualMode, we need to check if NFTPD VRScene supports them.
        // Assuming basic support or ignored if not.
        />
      </div>

      {/* Loading Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 z-[5000] flex items-center justify-center bg-black">
          <div className="flex flex-col items-center">
            <img src="/Medallions/NFTPD.png" alt="NFTPD Logo" className="w-16 h-16 animate-pulse mb-4" />
            <div className="text-white font-mono tracking-widest text-xl">
              INITIALIZING_PORTAL...
            </div>
          </div>
        </div>
      )}

      {/* Main Content Overlay */}
      {renderView()}

    </div>
  );
}

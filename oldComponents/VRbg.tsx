import React, { useEffect, useState } from 'react';
import { useActiveAccount } from 'thirdweb/react'; // Import thirdweb's active account hook
import Header from './Header';
import VRScene from './VRScene';
import Chatbot from './Chatbot';
import SelectionBar from './SelectionBar';
import Form from './MintForm'; // Import the Minting Form component
import LearnPanel from './Learn'; // Import the LearnPanel component
import AnalyzePanel from './Analyze'; // Import the AnalyzePanel component

let slideSoundEffect: HTMLAudioElement | null = null;
let tapSoundEffect: HTMLAudioElement | null = null;
let backgroundMusic: HTMLAudioElement | null = null;

export default function VRBackground() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false); // Detect mobile
  const [isVrSceneOnTop, setIsVrSceneOnTop] = useState(true); // VR scene starts on top for 15 seconds
  const [currentPanel, setCurrentPanel] = useState<string | null>('Chat');
  const activeAccount = useActiveAccount(); // Fetch active account

  const [isFormVisible, setIsFormVisible] = useState(false); // Controls form visibility
  const [isLearnVisible, setIsLearnVisible] = useState(false); // Controls LearnPanel visibility
  const [isChatVisible, setIsChatVisible] = useState(false); // Controls chat visibility
  const [isAnalyzeVisible, setIsAnalyzeVisible] = useState(false); // Controls AnalyzePanel visibility
  const [isFadingChat, setIsFadingChat] = useState(false); // To handle chat fade effect
  const [isSlidingForm, setIsSlidingForm] = useState(false); // To handle form sliding effect
  const [isSlidingLearn, setIsSlidingLearn] = useState(false); // To handle LearnPanel sliding effect
  const [isSlidingAnalyze, setIsSlidingAnalyze] = useState(false); // To handle AnalyzePanel sliding effect
  const [isMusicPlaying, setIsMusicPlaying] = useState(false); // For controlling background music
  const [isAudioLoaded, setIsAudioLoaded] = useState(false); // Control audio loading

  // Store the chatbot state in the parent component to persist across renders
  const [messages, setMessages] = useState<{ sender: 'user' | 'assistant'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [optionsVisible, setOptionsVisible] = useState(true);

  const initializeAudio = () => {
    if (!isAudioLoaded) {
      slideSoundEffect = new Audio('/static/sounds/slide.mp3');
      tapSoundEffect = new Audio('/static/sounds/tap.mp3');
      backgroundMusic = new Audio('/sax.mp3');
      backgroundMusic.loop = true;
      setIsAudioLoaded(true); // Mark audio as loaded after the first interaction
    }
  };

  // Detect if the user is on mobile and set the VR scene on top for 15 seconds
  useEffect(() => {
    const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    setIsMobile(isMobileDevice);

    if (isMobileDevice) {
      // Keep the VR scene on top for 15 seconds
      setTimeout(() => {
        setIsVrSceneOnTop(false); // After 15 seconds, move the VR scene to its normal stacking order
      }, 5000);
    } else {
      setIsVrSceneOnTop(false);
    }
  }, []);

  useEffect(() => {
    if (activeAccount && currentPanel === 'Buy') {
      setIsFormVisible(true);
      setIsSlidingForm(true);

      if (slideSoundEffect) {
        slideSoundEffect.volume = 1.0;
        slideSoundEffect.play();
      }
    } else {
      setIsSlidingForm(false);
      setTimeout(() => setIsFormVisible(false), 500); // Delay hiding to allow slide-down animation
    }

    if (activeAccount && currentPanel === 'Learn') {
      setIsLearnVisible(true);
      setIsSlidingLearn(true);

      if (slideSoundEffect) {
        slideSoundEffect.volume = 1.0;
        slideSoundEffect.play();
      }
    } else {
      setIsSlidingLearn(false);
      setTimeout(() => setIsLearnVisible(false), 500); // Delay hiding to allow slide-down animation
    }

    if (currentPanel === 'Chat') {
      setIsChatVisible(true);
      setIsFadingChat(true);

      if (slideSoundEffect) {
        slideSoundEffect.volume = 1.0;
        slideSoundEffect.play();
      }
    } else {
      setIsFadingChat(false);
      setTimeout(() => setIsChatVisible(false), 500); // Delay hiding to allow fade-out animation
    }

    if (activeAccount && currentPanel === 'Analyze') {
      setIsAnalyzeVisible(true);
      setIsSlidingAnalyze(true);

      if (slideSoundEffect) {
        slideSoundEffect.volume = 1.0;
        slideSoundEffect.play();
      }
    } else {
      setIsSlidingAnalyze(false);
      setTimeout(() => setIsAnalyzeVisible(false), 500); // Delay hiding to allow slide-down animation
    }
  }, [activeAccount, currentPanel]);

  const toggleMusic = () => {
    initializeAudio(); // Initialize audio on first interaction

    if (isMusicPlaying) {
      backgroundMusic?.pause();
    } else {
      backgroundMusic?.play();
    }
    setIsMusicPlaying(!isMusicPlaying);
  };

  const handlePanelChange = (panel: string | null) => {
    console.log(`Switching to panel: ${panel}`); // Add debug log
    setCurrentPanel(panel);
  };

  const renderPanel = () => {
    console.log(`Rendering panel: ${currentPanel}`); // Add debug log to verify which panel is rendering
    switch (currentPanel) {
      case 'Chat':
        return activeAccount ? (
          <div className={`chat-container ${isFadingChat ? 'fade-in' : 'fade-out'} ${isChatVisible ? '' : 'hidden'}`}>
            <Chatbot
              messages={messages}
              setMessages={setMessages}
              input={input}
              setInput={setInput}
              optionsVisible={optionsVisible}
              setOptionsVisible={setOptionsVisible}
            />
          </div>
        ) : (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center h-10 animate-fade-slide"></div>
        );
      case 'Buy':
        return (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center h-10 bg-opacity-50 animate-fade-slide"></div>
        );
      case 'Learn':
        return null; // Do not render LearnPanel here; it will be handled in the sliding container
      case 'Analyze':
        return null; // Remove AnalyzePanel from here; it will be handled in the sliding container
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full flex flex-col justify-between" style={{ height: '100vh' }}>
      {/* Loading Screen */}
      {!isLoaded && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <img src="/Medallions/NFTPD.png" alt="Loading..." className="animate-pulse h-20 w-20 mr-3" />
          <p className="text-white">Loading VR Environment...</p>
        </div>
      )}

      {/* VR Scene (Fixed Height, initially on top for mobile) */}
      <div
        className={`fixed inset-0 h-full w-full transition-all duration-1000 ${
          isVrSceneOnTop ? 'z-50' : 'z-0'
        }`}
      >
        <VRScene onLoad={() => setIsLoaded(true)} />
      </div>

      {/* Dynamic Panel Content */}
      <div className="flex-grow z-20 flex flex-col overflow-hidden">
        {renderPanel()}
      </div>

      {/* Only show the SelectionBar if the wallet is connected */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <SelectionBar onPanelChange={handlePanelChange} currentPanel={currentPanel} />
      </div>

      {/* Form container for sliding effect */}
      <div
        className={`fixed bottom-0 w-full z-30 transition-transform duration-500 ease-in-out ${
          isFormVisible && isSlidingForm ? 'transform -translate-y-10' : 'transform translate-y-full'
        } pointer-events-auto`}
      >
        {isFormVisible && (
          <div className="pb-4 rounded-t-lg overflow-y-auto max-h-[90vh]"> {/* Enable scrolling and limit height */}
            <Form />
          </div>
        )}
      </div>

      {/* Learn Panel container for sliding effect */}
      <div
        className={`fixed bottom-0 w-full z-30 transition-transform duration-500 ease-in-out ${
          isLearnVisible && isSlidingLearn ? 'transform -translate-y-10' : 'transform translate-y-full'
        } pointer-events-auto`}
      >
        {isLearnVisible && (
          <div className="pb-4 rounded-t-lg overflow-y-auto max-h-[90vh]"> {/* Enable scrolling and limit height */}
            <LearnPanel />
          </div>
        )}
      </div>

      {/* Analyze Panel container for sliding effect */}
      <div
        className={`fixed bottom-0 w-full z-30 transition-transform duration-500 ease-in-out ${
          isAnalyzeVisible && isSlidingAnalyze ? 'transform translate-y-0' : 'transform translate-y-full'
        } pointer-events-auto`}
      >
        {isAnalyzeVisible && (
          <div className="pb-0 rounded-t-lg max-h-[110vh]"> {/* Enable scrolling and limit height */}
            <AnalyzePanel
              directoryFacetAddress="0x123..." // Pass the correct address
              p0="someValue" // Pass the correct value
              cache={{}} // Pass the correct cache object or state
            />
          </div>
        )}
      </div>

      {/* Music control button */}
      {activeAccount && (
        <div className="fixed bottom-3 right-4 z-50">
          <button
            className={`p-0 rounded-full shadow-lg focus:outline-none ${isMusicPlaying ? 'bg-white/20' : 'bg-white/20'} text-white`}
            onClick={toggleMusic}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            {isMusicPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 4v16m12-16v16" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 3l14 9-14 9V3z" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

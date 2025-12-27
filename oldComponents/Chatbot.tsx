'use client'
import React, { useRef, useEffect, useState } from "react";
import dynamic from 'next/dynamic';
// Removed server-side SDK imports to avoid bundling issues in the browser
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks"; // Import the remark-breaks plugin

// // Initialize OpenAI API
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   dangerouslyAllowBrowser: true
// });

// Custom Message interface for chatbot
interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

// Event handling removed; server handles tool calls

function Chatbot({
  messages,
  setMessages,
  input,
  setInput,
  optionsVisible,
  setOptionsVisible,
}: {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  optionsVisible: boolean;
  setOptionsVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [typingMessage, setTypingMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [threadId, setThreadId] = useState<string | null>(null); // Store the current thread ID
  const [isPlaying, setIsPlaying] = useState<boolean>(false); // Track music playing status
  const audioRef = useRef<HTMLAudioElement | null>(null); // Audio reference
  // Removed OpenAI SDK usage on client
  const [voiceOpen, setVoiceOpen] = useState<boolean>(false);
  const enableVoiceAgent = process.env.NEXT_PUBLIC_ENABLE_VOICE_AGENT === 'true';
  const VoiceAgentModal = enableVoiceAgent ? dynamic(() => import('./VoiceAgentModal'), { ssr: false }) : (null as any);

  // Client calls server route directly; no client SDK needed

  // Azure deployment names
  const assistantId = process.env.NEXT_PUBLIC_ASSISTANT_ID as string; // if you are using Assistants API with an existing assistant
  const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT as string;

  let cancelResponse = useRef<boolean>(false); // Ref to track whether the response should be canceled

  // Scroll chat container to bottom when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  // Send user message and fetch response
  const handleSendMessage = async (message: string) => {
    // Reset streaming state for a clean new response
    cancelResponse.current = false;
    setTypingMessage('');
    const userMessage: Message = { sender: 'user', text: message };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setOptionsVisible(false);

    setTimeout(async () => {
      setIsTyping(true);
      setIsThinking(true);
      setTypingMessage('');
      const responseMessage = await getOpenAIResponse(message);

      // Only add the response if the cancelResponse flag is false
      if (!cancelResponse.current) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: 'assistant', text: responseMessage },
        ]);
      }
      setTypingMessage('');
      setIsTyping(false);
      setIsThinking(false);
    }, 1000);
  };

  // Fetch response from OpenAI
  const getOpenAIResponse = async (userInput: string): Promise<string> => {
    try {
      let currentThreadId = threadId;

      // Stream from server route using Azure OpenAI Chat Completions (streaming)
      // Switch to Azure Agents streaming endpoint
      const resp = await fetch('/api/agent/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput }),
      });
      if (!resp.ok || !resp.body) {
        const errText = await resp.text();
        throw new Error(errText || 'Stream failed');
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        if (cancelResponse.current) {
          try { await reader.cancel(); } catch { }
          break;
        }
        fullText += chunk;
        if (fullText.length > 0) {
          setIsThinking(false);
        }
        // update typing display as we stream (no double-append)
        setTypingMessage(fullText);
      }
      return fullText || 'No response.';
    } catch (error) {
      console.error("Error fetching response from OpenAI:", error);
      return "I encountered an issue. Please try again.";
    }
  };

  const handleOptionClick = (option: string) => {
    handleSendMessage(option);
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (input.trim()) {
      handleSendMessage(input);
      setInput('');
    }
  };

  const startNewChat = () => {
    cancelResponse.current = true; // Set cancel flag to true
    setMessages([]);
    setOptionsVisible(true);
    setInput('');
    setThreadId(null); // Reset thread ID
    setTypingMessage('');
    setIsTyping(false);
    setIsThinking(false);
  };

  // Toggle music play/pause
  const toggleMusic = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  // UI helpers
  const ThinkingDots = () => (
    <div className="flex items-center gap-1 py-2 px-4 rounded-2xl bg-white/90 backdrop-blur-md border border-white/10">
      <span className="sr-only">Thinking…</span>
      <span className="w-2 h-2 rounded-full bg-black/80 animate-pulse" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 rounded-full bg-black/70 animate-pulse" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 rounded-full bg-black/60 animate-pulse" style={{ animationDelay: '300ms' }} />
    </div>
  );

  const CodeBlock = ({ className, children, ...props }: any) => {
    const [copied, setCopied] = useState(false);
    const language = className?.replace('language-', '') || '';
    const text = String(children).replace(/\n$/, '');
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } catch { }
    };
    return (
      <div className="relative group">
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-2 right-2 z-10 text-[10px] px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 backdrop-blur-sm border border-white/10"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <pre className="bg-black/60 text-white p-3 rounded-xl overflow-auto border border-white/10 backdrop-blur-md">
          <code className={className} {...props}>{text}</code>
        </pre>
        {language && (
          <span className="absolute bottom-2 right-2 text-[10px] uppercase tracking-wider text-white/50">{language}</span>
        )}
      </div>
    );
  };

  return (
    <div className="chat-container p-4 rounded-3xl shadow-2xl flex flex-col h-full sm:h-screen border border-white/10 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl">
      {/* Audio element for background music */}
      <audio ref={audioRef} loop>
        <source src="/sax.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>

      <div ref={chatContainerRef} className="flex-grow overflow-y-auto mb-4 flex flex-col-reverse custom-scrollbar">
        <div className="chat-messages space-y-6 p-2 flex flex-col">
          {messages.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              {/* Name above the chat bubble */}
              <span className="text-[10px] tracking-wide text-white/60 mb-1 px-1">{msg.sender === 'user' ? 'You' : 'Walter'}</span>
              <div className="relative max-w-[78%] animate-float-bubble">
                <div className={`relative z-10 py-4 px-5 rounded-2xl border ${msg.sender === 'user' ? 'border-white/10 bg-white/10 text-black' : 'border-white/10 bg-white/90 text-black'} backdrop-blur-xl shadow-lg`}
                  style={{ maxWidth: '100%', wordWrap: 'break-word' }}>
                  {msg.sender === 'assistant' ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          return inline ? (
                            <code className="bg-black/10 text-black rounded px-1.5 py-0.5 border border-black/20" {...props}>
                              {children}
                            </code>
                          ) : (
                            <CodeBlock className={className} {...props}>{children}</CodeBlock>
                          );
                        },
                        p({ children }: any) {
                          return <p className="mb-3 leading-relaxed">{children}</p>;
                        },
                        h1({ children }: any) {
                          return <h1 className="text-xl font-bold mb-3 tracking-tight">{children}</h1>;
                        },
                        h2({ children }: any) {
                          return <h2 className="text-lg font-semibold mb-2 tracking-tight">{children}</h2>;
                        },
                        h3({ children }: any) {
                          return <h3 className="text-base font-semibold mb-2 tracking-tight">{children}</h3>;
                        },
                        blockquote({ children }: any) {
                          return (
                            <blockquote className="my-3 pl-4 border-l-4 border-black/30 text-black/80">{children}</blockquote>
                          );
                        },
                        ul({ children }: any) {
                          return <ul className="list-disc list-inside space-y-1 mb-3">{children}</ul>;
                        },
                        li({ children }: any) {
                          return <li className="">{children}</li>;
                        },
                        a({ href, children }: any) {
                          return <a href={href as string} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-4">{children}</a>;
                        },
                        hr() {
                          return <hr className="my-4 border-white/10" />;
                        },
                        table({ children }: any) {
                          return <div className="overflow-auto my-3"><table className="w-full text-sm border-separate border-spacing-0 rounded-xl overflow-hidden">{children}</table></div>;
                        },
                        thead({ children }: any) {
                          return <thead className="bg-white/5 text-white">{children}</thead>;
                        },
                        tbody({ children }: any) {
                          return <tbody className="">{children}</tbody>;
                        },
                        th({ children }: any) {
                          return <th className="text-left px-3 py-2 border-b border-white/10">{children}</th>;
                        },
                        td({ children }: any) {
                          return <td className="px-3 py-2 border-b border-white/5">{children}</td>;
                        },
                      } as any}>
                      {msg.text}
                    </ReactMarkdown>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex flex-col items-start">
              <span className="text-[10px] tracking-wide text-white/60 mb-1 px-1">Walter</span>
              {isThinking ? (
                <ThinkingDots />
              ) : (
                <div className="text-black py-3 px-5 rounded-2xl bg-white/90 backdrop-blur-md border border-white/10 shadow" style={{ maxWidth: '78%', wordWrap: 'break-word' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{typingMessage}</ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {messages.length === 0 && !isTyping && (
            <div className="flex justify-start">
              <div className="text-black py-2 px-4 bg-white/90 rounded-3xl" style={{ maxWidth: '75%', wordWrap: 'break-word' }}>
                Walter: How can I assist you today? Choose one of the options below to get started.
              </div>
            </div>
          )}
        </div>
      </div>

      {optionsVisible && (
        <div className="relative mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-3xl text-white text-sm shadow-xl border border-white/10 bg-white/10 backdrop-blur-xl">
            {[
              'What key areas does NFTPD focus on to enhance Web3 security and education?',
              'How does NFTPD incorporate Web3 technologies into its mission of promoting blockchain security?',
              'Can you explain NFTPD’s approach to educating the community about blockchain security and the Osiris Blacklist?',
              'How can I benefit from the partnerships and projects within the NFTPD network, especially related to Web3 security?',
            ].map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionClick(option)}
                className="py-3 px-4 rounded-2xl text-black bg-white/90 hover:bg-white border border-white/20 shadow transition-colors"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat-input-area flex items-center space-x-2 mb-16">
        <form onSubmit={handleFormSubmit} className="flex items-center space-x-2 w-full">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            className="flex-grow p-3 rounded-full text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/20 text-sm sm:text-base border border-white/20 bg-gray-800/60 backdrop-blur-xl"
            style={{
              color: 'white',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(31, 41, 55, 0.6)',
            }}
            placeholder="Type your message..."
          />
          {enableVoiceAgent && (
            <button
              type="button"
              onClick={() => setVoiceOpen(true)}
              className="p-3 text-white rounded-full shadow-lg bg-white/10 hover:bg-white/20 focus:outline-none border border-white/10 backdrop-blur-xl"
              aria-label="Open voice agent"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1v10" />
                <rect x="9" y="1" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0" />
                <path d="M12 19v4" />
                <path d="M8 23h8" />
              </svg>
            </button>
          )}
          <button
            type="submit"
            className="p-3 text-white rounded-full shadow-lg bg-white/10 hover:bg-white/20 focus:outline-none border border-white/10 backdrop-blur-xl"
            style={{
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9-7-9-7-9 7z" />
            </svg>
          </button>

          {!optionsVisible && (
            <button
              onClick={startNewChat}
              className="p-3 text-white rounded-full shadow-lg bg-white/10 hover:bg-white/20 focus:outline-none border border-white/10 backdrop-blur-xl"
              style={{
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
        </form>
      </div>
      {enableVoiceAgent && voiceOpen && VoiceAgentModal && (
        <VoiceAgentModal open={voiceOpen} onClose={() => setVoiceOpen(false)} />
      )}
    </div>
  );
}

export default Chatbot;

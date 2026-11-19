import { useRef, useEffect, useState } from "react";
import { API_URL } from "../utils/constants";

const BotIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="50"
    height="50"
    viewBox="0 0 1024 1024"
    className="shrink-0"
  >
    <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z" />
  </svg>
);

const GREETING = "Hi! How can I help you today?";
const THINKING = "Thinking...";

const ChatBot = ({ isOpen, onClose }) => {
  const [chatHistory, setChatHistory] = useState([]);
  const messageRef = useRef(null);
  const chatBodyRef = useRef(null);

  // Focus the input when the chat opens; Escape closes it.
  useEffect(() => {
    if (!isOpen) return undefined;
    messageRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Replaces the trailing "Thinking..." placeholder with the final bot message.
  const resolveThinking = (message, isError = false) =>
    setChatHistory((prev) => [
      ...prev.filter((m) => !m.pending),
      { role: "bot", message, error: isError },
    ]);

  async function generateBotResponse(history) {
    const messages = history
      .filter((m) => !m.error)
      .map(({ role, message }) => ({
        role: role === "bot" ? "assistant" : "user",
        content: message,
      }));

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch bot response");
      }
      resolveThinking(data.reply);
    } catch (error) {
      console.error("Chat error:", error);
      resolveThinking("Sorry, there was an error. Please try again.", true);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const userMessage = messageRef.current.value.trim();
    if (!userMessage || chatHistory.some((m) => m.pending)) return;
    messageRef.current.value = "";

    const updatedHistory = [
      ...chatHistory,
      { role: "user", message: userMessage },
    ];
    setChatHistory([
      ...updatedHistory,
      { role: "bot", message: THINKING, pending: true },
    ]);
    generateBotResponse(updatedHistory);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-4 sm:right-4 z-50">
      <div
        role="dialog"
        aria-label="Chat with Bot"
        className="bg-white w-full sm:w-[350px] md:w-[400px] h-[80vh] sm:h-[70vh] rounded-t-xl sm:rounded-xl shadow-lg flex flex-col border border-gray-300 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 bg-primary-600 text-white rounded-t-xl">
          <h2 className="text-lg font-semibold">🤖 Chat with Bot</h2>
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="text-white text-xl hover:text-red-300"
          >
            &times;
          </button>
        </div>

        <div
          ref={chatBodyRef}
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
          className="flex-1 overflow-y-auto px-4 py-2 space-y-2 bg-gray-50"
        >
          <div className="text-left">
            <div className="flex items-center bg-primary-100 p-2 rounded max-w-[80%]">
              <BotIcon /> {GREETING}
            </div>
          </div>

          {chatHistory.map((msg, index) => (
            <div
              key={index}
              className={msg.role === "bot" ? "text-left" : "text-right"}
            >
              <div
                className={`${
                  msg.role === "bot" ? "bg-primary-100" : "bg-green-100"
                } p-2 rounded max-w-[80%] inline-flex items-center text-left`}
              >
                {msg.role === "bot" && <BotIcon />}
                {msg.message}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-200 bg-white">
          <form className="flex space-x-2" onSubmit={handleSubmit}>
            <input
              ref={messageRef}
              type="text"
              maxLength={1000}
              aria-label="Type your message"
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;

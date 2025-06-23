import React, { useRef } from "react";

const ChatBot = ({ isOpen, onClose }) => {
  const [chatHistory, setChatHistory] = React.useState([]);

  const message = useRef();
  function handleSubmit(e) {
    e.preventDefault();
    const userMessage = message.current.value.trim();
    if (!userMessage) return;
    message.current.value = "";
    setChatHistory((pre) => [
      ...pre,
      {
        role: "user", // changed from "User" to "user" for consistency
        message: userMessage,
      },
    ]);

    // Simulate bot response
    setTimeout(() => {
      setChatHistory((pre) => [
        ...pre,
        {
          role: "bot", // changed from "mode" to "bot"
          message: "Thinking...",
        },
      ]);
      generateBotResponse([
        ...chatHistory,
        { role: "user", message: userMessage }, // pass the actual user message
      ]);
    }, 1000);
  }

  async function generateBotResponse(history) {
    history = history.map(({ role, message }) => ({
      role,
      parts: [{ text: message }],
    }));

    const requestOptions = {
      method: "POST", // changed from "GET" to "POST"
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents: history }),
    };

    try {
      const response = await fetch(
        import.meta.env.VITE_API_URL,
        requestOptions
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error?.message || "Failed to fetch bot response");

      // Remove the "Thinking..." message and add the real bot response
      setChatHistory((pre) => {
        // Remove last "bot" message (Thinking...)
        const updated = [...pre];
        const lastBotIndex = updated.map((msg) => msg.role).lastIndexOf("bot");
        if (lastBotIndex !== -1) {
          updated.splice(lastBotIndex, 1);
        }
        return [
          ...updated,
          {
            role: "bot",
            message: data.reply || "Sorry, I didn't understand that.",
          },
        ];
      });
    } catch (error) {
      setChatHistory((pre) => {
        // Remove last "bot" message (Thinking...)
        const updated = [...pre];
        const lastBotIndex = updated.map((msg) => msg.role).lastIndexOf("bot");
        if (lastBotIndex !== -1) {
          updated.splice(lastBotIndex, 1);
        }
        return [
          ...updated,
          {
            role: "bot",
            message: "Sorry, there was an error. Please try again.",
          },
        ];
      });
      console.log("servererror", error);
    }
  }

  if (!isOpen) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white w-[90vw] sm:w-[350px] md:w-[400px] h-[70vh] rounded-xl shadow-lg flex flex-col border border-gray-300">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 bg-primary-600 text-white rounded-t-xl">
          <h2 className="text-lg font-semibold">🤖 Chat with Bot</h2>
          <button
            onClick={onClose}
            className="text-white text-xl hover:text-red-300"
          >
            &times;
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 bg-gray-50">
          {/* Example messages */}
          <div className="text-left">
            <div className="flex items-center bg-primary-100 p-2 rounded max-w-[80%]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="50"
                height="50"
                viewBox="0 0 1024 1024"
              >
                <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z" />
              </svg>{" "}
              Hi! How can I help you today?
            </div>
          </div>
          {chatHistory.length > 0 &&
            chatHistory.map((msg, index) => (
              <div
                className={`${
                  msg.role === "bot" ? "text-left" : "text-right"
                } `}
                key={index}
              >
                <div
                  className={`${
                    msg.role === "bot" ? "bg-primary-100" : "bg-green-100"
                  } p-2 rounded max-w-[80%] flex items-center`}
                >
                  {msg.role === "bot" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="50"
                      height="50"
                      viewBox="0 0 1024 1024"
                    >
                      <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z" />
                    </svg>
                  )}
                  {msg.message}
                </div>
              </div>
            ))}
        </div>

        {/* Input Box */}
        <div className="p-3 border-t border-gray-200 bg-white">
          <form className="flex space-x-2" onSubmit={handleSubmit}>
            <input
              ref={message}
              type="text"
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

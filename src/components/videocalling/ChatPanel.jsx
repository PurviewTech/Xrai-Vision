import React, { useState, useEffect, useRef } from "react";
import { getDatabase, ref, push, onChildAdded, set } from "firebase/database";
import { FiPaperclip } from "react-icons/fi";

const ChatPanel = ({ callId, userId, userName, onCloseChat, dashboardMode = false, dashboardChatUser = null }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const fileInputRef = useRef();

  const database = getDatabase();

  useEffect(() => {
    let chatRef;
    if (dashboardMode && dashboardChatUser) {
      chatRef = ref(database, `dashboardChats/${userId}/${dashboardChatUser}/messages`);
    } else if (callId) {
      chatRef = ref(database, `videoCalls/${callId}/chatMessages`);
    } else {
      return;
    }
    const unsubscribe = onChildAdded(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const msg = snapshot.val();
        setMessages((prev) => [...prev, msg]);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [callId, database, dashboardMode, dashboardChatUser, userId]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    try {
      let chatRef;
      if (dashboardMode && dashboardChatUser) {
        const chatRef1 = ref(database, `dashboardChats/${userId}/${dashboardChatUser}/messages`);
        const chatRef2 = ref(database, `dashboardChats/${dashboardChatUser}/${userId}/messages`);
        const message = {
          senderId: userId,
          senderName: userName,
          timestamp: Date.now(),
          type: "text",
          content: text.trim(),
        };
        await Promise.all([
          set(push(chatRef1), message),
          set(push(chatRef2), message),
        ]);
        setMessageInput("");
        return;
      } else if (callId) {
        chatRef = ref(database, `videoCalls/${callId}/chatMessages`);
      } else {
        return;
      }
      const newMsgRef = push(chatRef);
      const message = {
        senderId: userId,
        senderName: userName,
        timestamp: Date.now(),
        type: "text",
        content: text.trim(),
      };
      await set(newMsgRef, message);
      setMessageInput("");
    } catch (err) {
      alert("Send failed: " + err.message);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Only image files are supported without Firebase Storage.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      if (dashboardMode && dashboardChatUser) {
        const chatRef1 = ref(database, `dashboardChats/${userId}/${dashboardChatUser}/messages`);
        const chatRef2 = ref(database, `dashboardChats/${dashboardChatUser}/${userId}/messages`);
        const message = {
          senderId: userId,
          senderName: userName,
          timestamp: Date.now(),
          type: "image",
          content: base64,
          fileName: file.name,
          fileMimeType: file.type,
        };
        await Promise.all([
          set(push(chatRef1), message),
          set(push(chatRef2), message),
        ]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      let chatRef;
      if (callId) {
        chatRef = ref(database, `videoCalls/${callId}/chatMessages`);
      } else {
        return;
      }
      const newMsgRef = push(chatRef);
      const message = {
        senderId: userId,
        senderName: userName,
        timestamp: Date.now(),
        type: "image",
        content: base64,
        fileName: file.name,
        fileMimeType: file.type,
      };
      await set(newMsgRef, message);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  return (
    dashboardMode ? (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="w-[40rem] h-[40rem] bg-gray-700 p-4 flex flex-col shadow-2xl rounded-2xl border border-gray-600">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">Chat</h2>
            <button
              onClick={onCloseChat}
              className="p-1 rounded-full hover:bg-gray-600"
              aria-label="Close Chat"
            >
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto mb-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-2 p-3 rounded-xl max-w-xs ${
                  msg.senderId === userId
                    ? "ml-auto bg-blue-600 text-white"
                    : "mr-auto bg-gray-600 text-white"
                }`}
              >
                <div className="text-sm font-semibold">{msg.senderName}</div>
                {msg.type === "text" && <div>{msg.content}</div>}
                {msg.type === "image" && (
                  <a
                    href={
                      msg.content.startsWith("data:image")
                        ? msg.content
                        : `data:image/jpeg;base64,${msg.content}`
                    }
                    download={msg.fileName || "chat_image.jpg"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={
                        msg.content.startsWith("data:image")
                          ? msg.content
                          : `data:image/jpeg;base64,${msg.content}`
                      }
                      alt={msg.fileName || "Image"}
                      className="max-w-full rounded mt-1"
                      onError={(e) => {
                        e.target.src = "/fallback-image.png";
                      }}
                    />
                  </a>
                )}
                {msg.type === "file" && (
                  <a
                    href={msg.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-white"
                  >
                    {msg.fileName || "Download file"}
                  </a>
                )}
                <div className="text-xs text-gray-300 mt-1">
                  {new Date(msg.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(messageInput)}
              placeholder="Type a message..."
              className="flex-1 p-2 border border-gray-500 rounded-l bg-gray-800 text-white"
              aria-label="Message input"
            />
            <button
              onClick={() => sendMessage(messageInput)}
              className="p-2 bg-blue-500 text-white rounded-r"
              aria-label="Send message"
            >
              Send
            </button>
          </div>
          <div className="mt-2">
            <label htmlFor="file-upload" className="cursor-pointer text-white">
              <FiPaperclip size={24} />
            </label>
            <input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              aria-label="Choose file to send"
            />
          </div>
        </div>
      </div>
    ) : (
      <div className="absolute top-0 right-0 w-80 h-full bg-gray-700 p-4 flex flex-col shadow-lg z-30">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">Chat</h2>
          <button
            onClick={onCloseChat}
            className="p-1 rounded-full hover:bg-gray-600"
            aria-label="Close Chat"
          >
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-2">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-2 p-3 rounded-xl max-w-xs ${
                msg.senderId === userId
                  ? "ml-auto bg-blue-600 text-white"
                  : "mr-auto bg-gray-600 text-white"
              }`}
            >
              <div className="text-sm font-semibold">{msg.senderName}</div>

              {msg.type === "text" && <div>{msg.content}</div>}

              {msg.type === "image" && (
                <a
                  href={
                    msg.content.startsWith("data:image")
                      ? msg.content
                      : `data:image/jpeg;base64,${msg.content}`
                  }
                  download={msg.fileName || "chat_image.jpg"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={
                      msg.content.startsWith("data:image")
                        ? msg.content
                        : `data:image/jpeg;base64,${msg.content}`
                    }
                    alt={msg.fileName || "Image"}
                    className="max-w-full rounded mt-1"
                    onError={(e) => {
                      e.target.src = "/fallback-image.png";
                    }}
                  />
                </a>
              )}

              {msg.type === "file" && (
                <a
                  href={msg.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-white"
                >
                  {msg.fileName || "Download file"}
                </a>
              )}

              <div className="text-xs text-gray-300 mt-1">
                {new Date(msg.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(messageInput)}
            placeholder="Type a message..."
            className="flex-1 p-2 border border-gray-500 rounded-l bg-gray-800 text-white"
            aria-label="Message input"
          />
          <button
            onClick={() => sendMessage(messageInput)}
            className="p-2 bg-blue-500 text-white rounded-r"
            aria-label="Send message"
          >
            Send
          </button>
        </div>

        <div className="mt-2">
          <label htmlFor="file-upload" className="cursor-pointer text-white">
            <FiPaperclip size={24} />
          </label>
          <input
            id="file-upload"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            aria-label="Choose file to send"
          />
        </div>
      </div>
    )
  );
};

export default ChatPanel;
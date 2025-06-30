import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, database } from "../../firebaseConfig";
import xrai from "../../assets/xrai.png";
import { ref, set, get, onValue, update, remove } from "firebase/database";
import { v4 as uuidv4 } from "uuid";
import { storage } from "../../firebaseConfig";
import { uploadBytesResumable, getDownloadURL } from "firebase/storage";
import ringtoneSound from "../../assets/iphone-ringtone-47958 (1).mp3";
import ChatPanel from "../videocalling/ChatPanel";
import notificationService from "../../services/notificationService";

// Action Dialog Component for Delete/Download Confirmations
const ActionDialog = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div className="bg-gray-800 p-4 rounded-lg max-w-md">
      <h2 className="text-xl font-bold mb-4">Confirm Action</h2>
      <p className="mb-6">{message}</p>
      <div className="flex justify-center space-x-4">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={onConfirm}
        >
          Confirm
        </button>
        <button
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

// Incoming Call Popup Component
const IncomingCallPopup = ({ caller, onAccept, onReject, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
    <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
      <div className="caller-info text-center">
        <div className="caller-avatar bg-blue-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-white">
            {caller?.name?.charAt(0) || caller?.callerName?.charAt(0) || caller?.caller?.charAt(0) || "U"}
          </span>
        </div>
        <h2 className="text-xl font-bold mb-2">
          {caller?.name || caller?.callerName || caller?.caller || "Unknown"}
        </h2>
        <p className="text-gray-300 mb-1">
          {caller?.title || "Group Call"}
        </p>
        <p className="text-sm text-gray-400">
          is calling you...
        </p>
      </div>
      <div className="flex justify-center space-x-4 mt-6">
        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full transition-colors flex items-center gap-2"
          onClick={onAccept}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          Accept
        </button>
        <button
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full transition-colors flex items-center gap-2"
          onClick={onReject}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Reject
        </button>
      </div>
      <button 
        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors" 
        onClick={onClose}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
);

// Help Popup Component
const HelpPopup = ({ onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-2">Agili8 Support</h2>
      <p>
        For support, please call{" "}
        <a href="tel:+611800841989" className="text-blue-400">
          +61 1800 841 989
        </a>{" "}
        or email{" "}
        <a href="mailto:help@agili8.com" className="text-blue-400">
          help@agili8.com
        </a>
      </p>
      <button
        onClick={onClose}
        className="mt-4 p-2 bg-blue-500 text-white rounded"
      >
        Close
      </button>
    </div>
  </div>
);

// Call History And Library Component
const CallHistoryAndLibrary = ({
  user,
  fetchCalls,
  calls,
  loadingCalls,
  selectedCapture,
  setSelectedCapture,
  isLibraryOpen,
  setIsLibraryOpen,
  showCallHistory,
  setShowCallHistory,
  deleteCapture,
  downloadCapture,
  actionDialog,
  setActionDialog,
  clearCallHistory,
}) => {
  // Render call cards for the library view
  const renderCallCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
      {loadingCalls ? (
        <div className="col-span-full flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : calls.length > 0 ? (
        calls
          .filter(
            (call) => call.captures && Object.keys(call.captures).length > 0
          )
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map((call) => (
            <div
              key={call.id}
              className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700 transition-all border border-gray-700"
              onClick={() => {
                setSelectedCapture({
                  callId: call.id,
                  captures: call.captures,
                  title: call.title,
                });
              }}
            >
              <h3 className="text-lg font-medium mb-2">
                {call.title || "Untitled Call"}
              </h3>
              <div className="flex justify-between text-sm text-gray-400">
                <span>
                  {new Date(
                    call.createdAt instanceof Date
                      ? call.createdAt
                      : new Date(call.createdAt)
                  ).toLocaleDateString()}
                </span>
                <span className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {call.captures ? Object.keys(call.captures).length : 0}{" "}
                  captures
                </span>
              </div>
            </div>
          ))
      ) : (
        <div className="col-span-full text-center py-8 text-gray-400">
          No captures available
        </div>
      )}
    </div>
  );

  // Render call history view
  const renderCallHistory = () => (
    <div className="grid grid-cols-1 gap-4 mt-4">
      {loadingCalls ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : calls.length > 0 ? (
        calls
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map((call) => {
            let participantsText = "Unknown";
            if (call.users) {
              if (Array.isArray(call.users)) {
                participantsText = call.users.join(", ");
              } else if (typeof call.users === "object") {
                participantsText = Object.keys(call.users).join(", ");
              } else if (typeof call.users === "string") {
                participantsText = call.users;
              }
            }

            return (
              <div
                key={call.id}
                className="bg-gray-800 p-4 rounded-lg border border-gray-700"
              >
                <h3 className="text-lg font-medium mb-2">
                  {call.title || "Untitled Call"}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                  <span className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {new Date(
                      call.createdAt instanceof Date
                        ? call.createdAt
                        : new Date(call.createdAt)
                    ).toLocaleDateString()}
                  </span>
                  <span className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {new Date(
                      call.createdAt instanceof Date
                        ? call.createdAt
                        : new Date(call.createdAt)
                    ).toLocaleTimeString()}
                  </span>
                  <span className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    {participantsText}
                  </span>
                  <span className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {call.captures ? Object.keys(call.captures).length : 0}{" "}
                    captures
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-sm text-gray-400">
                    Duration:{" "}
                    {call.duration
                      ? `${Math.round(call.duration / 60)} mins`
                      : "N/A"}
                  </span>
                </div>
              </div>
            );
          })
      ) : (
        <div className="text-center py-8 text-gray-400">
          No call history available
        </div>
      )}
    </div>
  );

  // Render selected capture view
  const renderCaptureView = () => {
    if (!selectedCapture || !selectedCapture.captures) return null;

    const capturesArray = Object.entries(selectedCapture.captures).map(
      ([captureId, capture]) => ({
        captureId,
        ...capture,
      })
    );

    return (
      <div className="mt-4">
        <div className="flex items-center mb-4">
          <button
            className="mr-2 bg-gray-700 hover:bg-gray-600 p-1 rounded"
            onClick={() => setSelectedCapture(null)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <h2 className="text-xl font-bold">
            {selectedCapture.title || "Call Captures"}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {capturesArray.length > 0 ? (
            capturesArray.map((capture, index) => {
              const fileName = capture.imageUrl
                ? `capture_${index}.jpg`
                : capture.videoUrl
                  ? `capture_${index}.mp4`
                  : `capture_${index}`;

              return (
                <div
                  key={capture.captureId}
                  className="bg-gray-800 p-2 rounded-lg border border-gray-700 flex flex-col"
                >
                  <div className="relative flex-grow">
                    {capture.imageUrl ? (
                      <img
                        src={capture.imageUrl}
                        alt={`Capture ${index}`}
                        className="w-full h-48 object-cover rounded"
                      />
                    ) : capture.videoUrl ? (
                      <video
                        controls
                        className="w-full h-48 object-cover rounded"
                      >
                        <source src={capture.videoUrl} type="video/mp4" />
                        Your browser does not support video playback.
                      </video>
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center bg-gray-700 rounded">
                        <span className="text-gray-400">
                          No preview available
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-sm text-gray-400">
                    <p>
                      Timestamp: {new Date(capture.timestamp).toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-2 flex space-x-2">
                    <button
                      onClick={() =>
                        setActionDialog({
                          message: `Are you sure you want to download this capture?`,
                          onConfirm: () =>
                            downloadCapture(
                              capture.imageUrl || capture.videoUrl,
                              fileName
                            ),
                          onCancel: () => setActionDialog(null),
                        })
                      }
                      className="flex-1 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download
                    </button>
                    <button
                      onClick={() =>
                        setActionDialog({
                          message: `Are you sure you want to delete this capture? This action cannot be undone.`,
                          onConfirm: () =>
                            deleteCapture(
                              selectedCapture.callId,
                              capture.captureId
                            ),
                          onCancel: () => setActionDialog(null),
                        })
                      }
                      className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded text-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-8 text-gray-400">
              No captures available for this call
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      {isLibraryOpen && !showCallHistory && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Library</h2>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded flex items-center gap-1 text-sm"
              onClick={fetchCalls}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
          {selectedCapture ? renderCaptureView() : renderCallCards()}
        </div>
      )}

      {showCallHistory && !isLibraryOpen && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Call History</h2>
            <div className="flex space-x-2">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded flex items-center gap-1 text-sm"
                onClick={fetchCalls}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded flex items-center gap-1 text-sm"
                onClick={() =>
                  setActionDialog({
                    message:
                      "Are you sure you want to clear your entire call history? This action cannot be undone.",
                    onConfirm: () => clearCallHistory(user.uid),
                    onCancel: () => setActionDialog(null),
                  })
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Clear
              </button>
            </div>
          </div>
          {renderCallHistory()}
        </div>
      )}
    </div>
  );
};

// Contact Selection Modal Component
const ContactSelectionModal = ({ 
  isOpen, 
  onClose, 
  users, 
  selectedContacts, 
  onContactToggle, 
  onStartCall,
  loading 
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredUsers = users.filter(user => 
    user.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Start New Call</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
          />
        </div>
        
        <div className="max-h-60 overflow-y-auto mb-4">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-400">Loading contacts...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((contact, index) => (
              <div
                key={index}
                className={`flex items-center p-3 rounded cursor-pointer transition-colors ${
                  selectedContacts.includes(contact)
                    ? "bg-blue-600 border border-blue-400"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
                onClick={() => onContactToggle(contact)}
              >
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                  {contact.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{contact}</div>
                </div>
                {selectedContacts.includes(contact) && (
                  <div className="text-blue-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-400">
              {searchQuery ? "No contacts found" : "No contacts available"}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onStartCall}
              disabled={selectedContacts.length === 0 || loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Starting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  Start Call
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ user, onLogout }) => {
  const ringtoneRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUsers, setShowUsers] = useState(true);
  const [incomingCall, setIncomingCall] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [calls, setCalls] = useState([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [captures, setCaptures] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [isHelpPopupOpen, setIsHelpPopupOpen] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [selectedCapture, setSelectedCapture] = useState(null);
  const [actionDialog, setActionDialog] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dashboardChatUser, setDashboardChatUser] = useState(null);
  const [dashboardChatPanelOpen, setDashboardChatPanelOpen] = useState(false);

  // Contact selection modal state
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [contactModalLoading, setContactModalLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (incomingCall) {
      ringtoneRef.current?.play();
    } else {
      ringtoneRef.current?.pause();
    }
  }, [incomingCall]);

  const toggleHelpPopup = () => setIsHelpPopupOpen(!isHelpPopupOpen);
  const closeHelpPopup = () => setIsHelpPopupOpen(false);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  useEffect(() => {
    if (!user?.uid) return;

    // Initialize notification service for push notifications
    notificationService.initialize(user.uid);

    const fetchLicenseIds = async () => {
      setLoading(true);
      try {
        const companiesRef = collection(db, "companies");
        const q = query(
          companiesRef,
          where("companyName", "==", user.companyName)
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setUsers([]);
        } else {
          const doc = querySnapshot.docs[0];
          const docData = doc.data();
          const licenseIds = docData.licenses.map(
            (license) => license.licenseId
          );
          const filteredLicenseIds = licenseIds.filter(
            (licenseId) => licenseId !== user.uid
          );
          setUsers(filteredLicenseIds);
        }
      } catch {
        // No error handling needed
      } finally {
        setLoading(false);
      }
    };

    const fetchFavorites = async () => {
      const favoritesRef = ref(database, `active_users/${user.uid}/favorites`);
      onValue(favoritesRef, (snapshot) => {
        const data = snapshot.val();
        setFavorites(data ? Object.keys(data) : []);
      });
    };

    fetchLicenseIds();
    fetchFavorites();

    const incomingCallRef = ref(
      database,
      `incoming_calls/${user.uid}`
    );
    let isInitialLoad = true;
    let currentCallKey = null;

    const unsubscribe = onValue(incomingCallRef, (snapshot) => {
      const callData = snapshot.val();

      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }

      if (
        !callData ||
        (Array.isArray(callData) && callData.length === 0) ||
        (typeof callData === "object" && Object.keys(callData).length === 0)
      ) {
        setIncomingCall(null);
        return;
      }

      const latestPendingCall = Object.entries(callData)
        .map(([key, value]) => ({ key, ...value }))
        .filter(
          (call) => call.status === "pending" && call.key !== currentCallKey
        )
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      if (latestPendingCall) {
        currentCallKey = latestPendingCall.key;
        setIncomingCall({
          ...latestPendingCall,
          name: latestPendingCall.callerName || latestPendingCall.caller || "Unknown",
          roomId: latestPendingCall.callId,
        });
      } else {
        setIncomingCall(null);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    const capturesRef = ref(database, `videoCalls`);
    get(capturesRef).then((snapshot) => {
      if (snapshot.exists()) {
        const videoCalls = snapshot.val();
        const allCaptures = Object.entries(videoCalls).flatMap(
          ([callId, call]) => {
            return Object.entries(call.captures || {}).map(
              ([captureId, capture]) => ({
                callId,
                captureId,
                ...capture,
              })
            );
          }
        );
        setCaptures(allCaptures);
      }
    });
  }, []);

  const toggleFavorite = async (licenseId) => {
    const favoriteRef = ref(
      database,
      `active_users/${user.uid}/favorites/${licenseId}`
    );
    try {
      if (favorites.includes(licenseId)) {
        await remove(favoriteRef);
        setFavorites(favorites.filter((id) => id !== licenseId));
      } else {
        await set(favoriteRef, { addedAt: Date.now() });
        setFavorites([...favorites, licenseId]);
      }
    } catch {
      // No error handling needed
    }
  };

  const initiateCall = async (selectedUser) => {
    const callId = uuidv4();
    const videoCallRef = ref(database, `videoCalls/${callId}`);
    const userId = user?.uid;
    const callTitle = "Video Call";
    if (!userId || !selectedUser) return;
    // Create the call in the database
    await set(videoCallRef, {
      title: callTitle,
      createdAt: Date.now(),
      createdBy: userId,
      active: true,
      users: [userId, selectedUser],
      status: "pending",
    });

    // Send notification/invitation to the callee
    const newCallNotification = ref(
      database,
      `active_users/${selectedUser}/incoming_calls/${callId}`
    );
    await set(newCallNotification, {
      roomId: callId,
      userId: userId,
      status: "pending",
      timestamp: Date.now(),
      title: callTitle,
      isNew: true,
      type: "invitation",
    });

    // Navigate to the video call page
    openVideoCallWindow(
      { uid: userId, companyName: user.companyName },
      callId,
      callTitle
    );
  };

  const openVideoCallWindow = (user, callId, title) => {
    navigate(
      `/video-call?callId=${callId}&uid=${user.uid}&title=${encodeURIComponent(title)}`
    );
  };

  const handleAcceptCall = async () => {
    try {
      if (!incomingCall || !incomingCall.callId) {
        console.error("No valid incoming call to accept");
        setIncomingCall(null);
        return;
      }

      console.log(`Accepting call with callId: ${incomingCall.callId}`);

      const videoCallRef = ref(database, `videoCalls/${incomingCall.callId}`);
      const videoCallSnapshot = await get(videoCallRef);

      if (!videoCallSnapshot.exists()) {
        console.error(
          "Call room does not exist. The caller may have canceled the call."
        );
        const incomingCallRefToRemove = ref(
          database,
          `incoming_calls/${user.uid}/${incomingCall.key}`
        );
        await remove(incomingCallRefToRemove);
        alert(
          "This call is no longer available. The caller may have ended the call."
        );
        setIncomingCall(null);
        return;
      }

      const videoCallData = videoCallSnapshot.val();
      
      // Update the call data to include the new participant
      const updatedUsers = {
        ...videoCallData.users,
        [user.uid]: {
          name: user.uid,
          role: "participant",
          joinedAt: new Date().toISOString(),
          status: "active"
        }
      };

      await update(videoCallRef, {
        users: updatedUsers,
        status: "active",
        lastUpdated: new Date().toISOString(),
      });

      // Remove the incoming call notification
      const incomingCallRefToRemove = ref(
        database,
        `incoming_calls/${user.uid}/${incomingCall.key}`
      );
      await remove(incomingCallRefToRemove);

      const callTitle = videoCallData.title || "Group Call";
      openVideoCallWindow(
        { uid: user.uid, companyName: user.companyName },
        incomingCall.callId,
        callTitle
      );
      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      setIncomingCall(null);
    }
  };

  const handleRejectCall = async () => {
    if (incomingCall) {
      try {
        const incomingCallRef = ref(
          database,
          `incoming_calls/${user.uid}/${incomingCall.key}`
        );
        await remove(incomingCallRef);
        
        // Optionally notify the caller that the call was rejected
        if (incomingCall.caller) {
          const rejectionRef = ref(
            database,
            `call_responses/${incomingCall.caller}/${incomingCall.callId}`
          );
          await set(rejectionRef, {
            status: 'rejected',
            rejectedBy: user.uid,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error rejecting call:', error);
      }
      setIncomingCall(null);
    }
  };

  const handleClosePopup = () => setIncomingCall(null);

  const handleSelectUserForChat = async (selectedUser) => {
    if (!selectedUser) return;
    setSelectedUser(selectedUser);
    setIsLibraryOpen(false);
    setShowCallHistory(false);
    try {
      const userChatRef = ref(
        database,
        `active_users/${user.uid}/chats/${selectedUser}`
      );
      const snapshot = await get(userChatRef);
      if (snapshot.exists()) fetchChatMessages(user, selectedUser);
      else {
        await createChatRoom(user, selectedUser);
        fetchChatMessages(user, selectedUser);
      }
    } catch {
      // No error handling needed
    }
  };

  const createChatRoom = async (user, selectedUser) => {
    if (!user || !selectedUser) return;
    const newChatId = uuidv4();
    const roomRef = ref(database, `chatRooms/${newChatId}`);
    await set(roomRef, {
      users: [user.uid, selectedUser],
      [`${user.uid}_messages`]: {
        [uuidv4()]: {
          userId: user.uid,
          content: "Start chat",
          timestamp: Date.now(),
        },
      },
      [`${selectedUser}_messages`]: {
        [uuidv4()]: {
          userId: selectedUser,
          content: "Start chat",
          timestamp: Date.now(),
        },
      },
    })
      .then(() => saveChatIdForUser(user.uid, selectedUser, newChatId))
      .catch(() => {});
  };

  const saveChatIdForUser = async (userId, selectedUserId, chatId) => {
    if (!userId || !selectedUserId || !chatId) return;
    const timestamp = Date.now();
    await Promise.all([
      set(ref(database, `active_users/${userId}/chats/${selectedUserId}`), {
        chatRoomId: chatId,
        timestamp,
      }),
      set(ref(database, `active_users/${selectedUserId}/chats/${userId}`), {
        chatRoomId: chatId,
        timestamp,
      }),
    ]).catch(() => {});
  };

  const handleSendMessage = async () => {
    if (!user || !selectedUser || !messageInput.trim()) return;
    try {
      const messageId = uuidv4();
      const chatRoomIdRef = ref(
        database,
        `active_users/${user.uid}/chats/${selectedUser}/chatRoomId`
      );
      onValue(chatRoomIdRef, async (snapshot) => {
        const chatRoomId = snapshot.val();
        if (!chatRoomId) return;
        const userMessagePath = `chatRooms/${chatRoomId}/${user.uid}_messages`;
        await update(ref(database, userMessagePath), {
          [messageId]: {
            userId: user.uid,
            content: messageInput,
            timestamp: Date.now(),
          },
        });
        setMessageInput("");
      });
    } catch {
      // No error handling needed
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const storageRef = ref(storage, `chat_files/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) =>
          console.log(
            `Upload is ${(snapshot.bytesTransferred / snapshot.totalBytes) * 100}% done`
          ),
        (error) => console.error("Error uploading file:", error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const messageId = uuidv4();
          const chatRoomIdRef = ref(
            database,
            `active_users/${user.uid}/chats/${selectedUser}/chatRoomId`
          );
          onValue(chatRoomIdRef, async (snapshot) => {
            const chatRoomId = snapshot.val();
            if (!chatRoomId) return;
            const userMessagePath = `chatRooms/${chatRoomId}/${user.uid}_messages`;
            await update(ref(database, userMessagePath), {
              [messageId]: {
                userId: user.uid,
                content: downloadURL,
                timestamp: Date.now(),
                type: "file",
                fileName: file.name,
              },
            });
          });
        }
      );
    } catch {
      // No error handling needed
    }
  };

  const fetchChatMessages = (user, selectedUser) => {
    if (!user || !selectedUser) return;
    const chatRoomIdRef = ref(
      database,
      `active_users/${user.uid}/chats/${selectedUser}/chatRoomId`
    );
    onValue(chatRoomIdRef, (snapshot) => {
      const chatRoomId = snapshot.val();
      if (!chatRoomId) return;
      const messagesRef = ref(database, `chatRooms/${chatRoomId}`);
      onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        const combinedMessages = [
          ...Object.values(data?.[`${user.uid}_messages`] || {}),
          ...Object.values(data?.[`${selectedUser}_messages`] || {}),
        ];
        const sortedMessages = combinedMessages.sort(
          (a, b) => a.timestamp - b.timestamp
        );
        setChatMessages(sortedMessages);
      });
    });
  };

  const fetchCalls = async () => {
    setLoadingCalls(true);
    try {
      const snapshot = await get(ref(database, "videoCalls"));
      const data = snapshot.val();
      if (data) {
        const callsArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setCalls(callsArray);
      } else {
        setCalls([]);
      }
    } catch {
      // No error handling needed
    } finally {
      setLoadingCalls(false);
    }
  };

  const deleteCapture = async (callId, captureId) => {
    try {
      const captureRef = ref(
        database,
        `videoCalls/${callId}/captures/${captureId}`
      );
      await remove(captureRef);
      console.log("Capture deleted successfully");
      setCaptures(
        captures.filter((capture) => capture.captureId !== captureId)
      );
      setCalls(
        calls.map((call) => {
          if (call.id === callId) {
            const updatedCaptures = { ...call.captures };
            delete updatedCaptures[captureId];
            return { ...call, captures: updatedCaptures };
          }
          return call;
        })
      );
      setActionDialog(null);
    } catch {
      // No error handling needed
    }
  };

  const downloadCapture = (url, fileName) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || "capture";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActionDialog(null);
  };

  const clearCallHistory = async (userId) => {
    try {
      if (!userId) {
        console.error("User ID not available");
        return;
      }

      const callsSnapshot = await get(ref(database, "videoCalls"));

      if (!callsSnapshot.exists()) {
        console.log("No calls to clear");
        setActionDialog(null);
        return;
      }

      const promises = [];
      const callsData = callsSnapshot.val();

      Object.entries(callsData).forEach(([callId, call]) => {
        const isUserInCall =
          call.users &&
          ((Array.isArray(call.users) && call.users.includes(userId)) ||
            (typeof call.users === "object" &&
              Object.keys(call.users).includes(userId)) ||
            call.createdBy === userId);

        if (isUserInCall) {
          promises.push(remove(ref(database, `videoCalls/${callId}`)));
        }
      });

      await Promise.all(promises);
      setCalls([]);
      console.log("Call history cleared successfully");
      setActionDialog(null);
    } catch {
      // No error handling needed
    }
  };

  // Contact selection modal functions
  const openContactModal = () => {
    setShowContactModal(true);
    setSelectedContacts([]);
  };

  const closeContactModal = () => {
    setShowContactModal(false);
    setSelectedContacts([]);
  };

  const toggleContactSelection = (contact) => {
    setSelectedContacts(prev => 
      prev.includes(contact) 
        ? prev.filter(c => c !== contact)
        : [...prev, contact]
    );
  };

  const startNewCall = async () => {
    if (selectedContacts.length === 0) return;

    setContactModalLoading(true);
    try {
      // Generate a unique call ID
      const callId = uuidv4();
      const callTitle = `Group Call - ${new Date().toLocaleString()}`;
      
      // Create the call in Firebase
      const callData = {
        id: callId,
        title: callTitle,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        status: 'waiting',
        participants: selectedContacts,
        users: {
          [user.uid]: {
            name: user.uid,
            role: 'host',
            joinedAt: new Date().toISOString(),
            status: 'active'
          }
        }
      };

      // Save call data to Firebase
      await set(ref(database, `videoCalls/${callId}`), callData);

      // Send invitations to selected contacts
      for (const contact of selectedContacts) {
        const invitationData = {
          callId: callId,
          title: callTitle,
          caller: user.uid,
          callerName: user.uid,
          timestamp: new Date().toISOString(),
          status: 'pending'
        };

        await set(ref(database, `incoming_calls/${contact}/${callId}`), invitationData);
      }

      // Send push notifications to Android users
      await notificationService.sendPushNotification(selectedContacts, {
        callId: callId,
        title: callTitle,
        body: `${user.uid} is calling you`,
        caller: user.uid
      });

      // Close modal and navigate to video call
      closeContactModal();
      navigate(`/video-call?callId=${callId}&uid=${user.uid}&title=${encodeURIComponent(callTitle)}`);

    } catch (error) {
      console.error('Error starting new call:', error);
      // You could add error handling here, like showing a toast notification
    } finally {
      setContactModalLoading(false);
    }
  };

  const handleLogout = () => {
    // Cleanup notification service
    notificationService.cleanup(user?.uid);
    onLogout();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header
        className="py-2 px-4 flex justify-between items-center"
        style={{
          background:
            "linear-gradient(135deg, #404AD9 25%, #2C82FF 50%, #9B51EB 75%, #F74FFC 100%)",
          height: "80px",
          width: "100%",
        }}
      >
        <div className="flex items-center justify-start space-x-4">
          <div className="h-16 w-16 sm:h-32 sm:w-32">
            <img
              src={xrai}
              alt="SurgeView Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex items-center bg-blue-600/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-blue-400/50 shadow-lg">
            <div className="bg-blue-800 rounded-full p-1.5 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1zM12 7a5 5 0 1 0 5 5 5.006 5.006 0 0 0-5-5zm0 8a3 3 0 1 1-3-3 3.003 3.003 0 0 1 3 3z" />
              </svg>
            </div>
            <span className="ml-2 text-sm sm:text-base font-medium text-white">
              {user?.uid?.substring(0, 16) || "User"}
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-wrap gap-1.5 sm:gap-2 mt-1 sm:mt-0">
          <button
            onClick={() => {
              setIsLibraryOpen(!isLibraryOpen);
              setShowCallHistory(false);
              setSelectedCapture(null);
              setSelectedUser(null);
              if (!isLibraryOpen) fetchCalls();
            }}
            className="bg-blue-600/80 hover:bg-blue-700 backdrop-blur-md text-white text-xs font-medium py-1.5 px-2.5 sm:px-3 border-white/30 rounded-lg transition-colors flex items-center gap-1.5 border border-white shadow"
          >
            <div className="bg-blue-900  hover:bg-blue-700 rounded-full p-1 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span>Library</span>
          </button>

          <button
            className="bg-blue-600/80 hover:bg-blue-700 backdrop-blur-md text-white text-xs font-medium py-1.5 px-2.5 sm:px-3 border-white/30 rounded-lg transition-colors flex items-center gap-1.5 border border-white shadow"
            onClick={() => {
              setShowCallHistory(!showCallHistory);
              setIsLibraryOpen(false);
              setSelectedCapture(null);
              setSelectedUser(null);
              if (!showCallHistory) fetchCalls();
            }}
          >
            <div className="bg-blue-900  rounded-full p-1 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span>Call History</span>
          </button>

          <button
            className="bg-blue-600/80  hover:bg-purple-700/80 backdrop-blur-md text-white text-xs font-medium py-1.5 px-2.5 sm:px-3  border-white/30 rounded-lg transition-colors flex items-center gap-1.5 border border-white shadow"
            onClick={toggleHelpPopup}
          >
            <div className="bg-blue-900  rounded-full p-1 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span>Help</span>
          </button>

          <button
            className="bg-red-600/70 hover:bg-red-700/80 backdrop-blur-md text-white text-xs font-medium py-1.5 px-2.5 sm:px-3  border-white/30 rounded-lg transition-colors flex items-center gap-1.5 border border-white shadow"
            onClick={handleLogout}
          >
            <div className="bg-red-800 rounded-full p-1 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </div>
            <span>Logout</span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button onClick={toggleMenu} className="p-2 bg-gray-800 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-blue-600 bg-opacity-50 z-50 md:hidden">
          <div className="absolute top-0 right-0 mt-16 mr-4 bg-white rounded-lg shadow-lg p-4 w-64">
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => {
                  setIsLibraryOpen(!isLibraryOpen);
                  setShowCallHistory(false);
                  setSelectedCapture(null);
                  setSelectedUser(null);
                  if (!isLibraryOpen) fetchCalls();
                  toggleMenu();
                }}
                className="flex items-center  bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
              >
                <div className="bg-blue-950 rounded-full p-1 mr-2 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span>Library</span>
              </button>

              <button
                onClick={() => {
                  setShowCallHistory(!showCallHistory);
                  setIsLibraryOpen(false);
                  setSelectedCapture(null);
                  setSelectedUser(null);
                  if (!showCallHistory) fetchCalls();
                  toggleMenu();
                }}
                className="flex items-center  bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
              >
                <div className="bg-blue-950 rounded-full p-1 mr-2 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span>Call History</span>
              </button>

              <button
                onClick={() => {
                  toggleHelpPopup();
                  toggleMenu();
                }}
                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
              >
                <div className="bg-blue-950 rounded-full p-1 mr-2 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span>Help</span>
              </button>

              <button
                onClick={() => {
                  handleLogout();
                  toggleMenu();
                }}
                className="flex items-center bg-red-600/80 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
              >
                <div className="bg-blue-950 rounded-full p-1 mr-2 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </div>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
        <aside className="bg-gray-800 w-full sm:w-80 space-y-4 py-3 sm:py-7 px-2 overflow-y-auto">
          <div className="flex justify-between items-center px-2 sm:px-4">
            <h3 className="text-sm sm:text-base font-medium">Contacts</h3>
            <button
              className="text-yellow-400 text-xs sm:text-sm"
              onClick={() => setShowFavorites(!showFavorites)}
            >
              {showFavorites ? "Show All" : "Favourites"}
            </button>
          </div>
          <div className="space-y-2">
            {loading && <div className="text-center text-sm">Loading...</div>}
            {showUsers && users.length > 0 ? (
              (showFavorites ? favorites : users).map((licenseId, index) => (
                <div
                  key={index}
                  className={`flex items-center p-2 bg-gray-700 rounded mx-1 sm:mx-2 ${
                    favorites.includes(licenseId)
                      ? "border-l-4 border-yellow-400"
                      : ""
                  }`}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                    {licenseId.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm sm:text-base truncate">
                      {licenseId}
                    </div>
                    {/* <div className="text-xs sm:text-sm text-gray-400">
                      Online
                    </div> */}
                  </div>
                  <div className="flex space-x-1 sm:space-x-2 ml-1">
                    <button
                      className="text-white p-1"
                      onClick={() => initiateCall(licenseId)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M23 7l-7 5 7 5V7z" />
                        <rect
                          x="1"
                          y="5"
                          width="15"
                          height="14"
                          rx="2"
                          ry="2"
                        />
                      </svg>
                    </button>
                    <button
                      className="text-white p-1"
                      onClick={() => {
                        setDashboardChatUser(licenseId);
                        setDashboardChatPanelOpen(true);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-1.998 2M14 2H4a1 1 0 0 0-1 1h9.002a2 2 0 0 1 2 2v7A1 1 0 0 0 15 11V3a1 1 0 0 0-1-1M2.002 4a1 1 0 0 0-1 1v8l2.646-2.354a.5.5 0 0 1 .63-.062l2.66 1.773 3.71-3.71a.5.5 0 0 1 .577-.094l1.777 1.947V5a1 1 0 0 0-1-1z" />
                      </svg>
                    </button>
                    <button
                      className="text-white p-1"
                      onClick={() => toggleFavorite(licenseId)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill={favorites.includes(licenseId) ? "yellow" : "none"}
                        stroke="currentColor"
                      >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 7.05 2.02 9.24l7.19 7.03L12 17.27z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-sm">
                {showFavorites
                  ? "No favorite contacts"
                  : "No contacts available"}
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-2 sm:p-4">
          {/* Chat component */}
          {selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
              <div className="bg-gray-800 p-3 sm:p-4 rounded-lg w-full max-w-md">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <h2 className="text-lg sm:text-xl font-bold truncate">
                    {selectedUser}
                  </h2>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-gray-400 hover:text-white"
                    aria-label="Close chat"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      ></path>
                    </svg>
                  </button>
                </div>
                <div className="space-y-2 mb-3 sm:mb-4 max-h-[50vh] overflow-y-auto p-1">
                  {chatMessages.length > 0 ? (
                    chatMessages.map((msg, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded max-w-[80%] ${
                          msg.userId === user.uid
                            ? "bg-blue-500 ml-auto text-white"
                            : "bg-gray-700 mr-auto"
                        }`}
                      >
                        <p className="text-sm break-words">
                          {msg.type === "file" ? (
                            <a
                              href={msg.content}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-300 hover:underline flex items-center"
                            >
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                ></path>
                              </svg>
                              {msg.fileName || "File"}
                            </a>
                          ) : (
                            msg.content
                          )}
                        </p>
                        <span className="text-xs text-gray-400 block text-right mt-1">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-sm text-gray-400 py-4">
                      No messages yet
                    </div>
                  )}
                </div>
                <div className="flex">
                  <label
                    htmlFor="file-input"
                    className="p-2 bg-gray-700 text-gray-300 hover:text-white rounded-l cursor-pointer"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      ></path>
                    </svg>
                  </label>
                  <input
                    id="file-input"
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1 p-2 bg-gray-700 text-sm border-x-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-r transition-colors"
                    aria-label="Send message"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Library and Call History components */}
          {(isLibraryOpen || showCallHistory) && !selectedUser && (
            <CallHistoryAndLibrary
              user={user}
              fetchCalls={fetchCalls}
              calls={calls}
              loadingCalls={loadingCalls}
              selectedCapture={selectedCapture}
              setSelectedCapture={setSelectedCapture}
              isLibraryOpen={isLibraryOpen}
              setIsLibraryOpen={setIsLibraryOpen}
              showCallHistory={showCallHistory}
              setShowCallHistory={setShowCallHistory}
              deleteCapture={deleteCapture}
              downloadCapture={downloadCapture}
              actionDialog={actionDialog}
              setActionDialog={setActionDialog}
              clearCallHistory={clearCallHistory}
            />
          )}

          {/* Welcome screen when nothing is selected */}
          {!selectedUser && !isLibraryOpen && !showCallHistory && (
            <div className="text-center py-8">
              <div className="bg-gray-800 p-8 rounded-lg max-w-lg mx-auto">
                <h2 className="text-2xl font-bold mb-4">
                  Welcome to Xrai Dashboard
                </h2>
                <p className="mb-6">
                  Choose a contact from the sidebar to start a video call or
                  chat, or click the buttons in the header to view your call
                  history or library.
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={openContactModal}
                    className="bg-blue-600/80 hover:bg-purple-700/80 backdrop-blur-md text-white text-xs font-medium py-1.5 px-2 sm:px-3 border-white/30 rounded-lg transition-colors flex items-center justify-center gap-2 border border-white shadow w-full sm:w-auto"
                  >
                    <div className="bg-blue-900 hover:bg-blue-800 rounded-full p-2 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm15 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z" />
                      </svg>
                    </div>
                    <span>Start New Call</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsLibraryOpen(true);
                      fetchCalls();
                    }}
                    className="bg-purple-600/80 hover:bg-blue-700/80 backdrop-blur-md text-white text-xs font-medium py-1.5 px-2 sm:px-3 border-white/30 rounded-lg transition-colors flex items-center justify-center gap-2 border border-white shadow w-full sm:w-auto"
                  >
                    <div className="bg-blue-900/80 hover:bg-blue-800 rounded-full p-2 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm5.5 1.5v2a1 1 0 0 0 1 1h2l-3-3zM2 2a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1H2zm9 0a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1zm-9 7a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1H2zm9 0a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1z" />
                      </svg>
                    </div>
                    <span>View Library</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <audio ref={ringtoneRef} src={ringtoneSound} loop />
      {/* Incoming call popup - always show this on top */}
      {incomingCall && (
        <IncomingCallPopup
          caller={incomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          onClose={handleClosePopup}
        />
      )}

      {/* Help popup - show this on top when open */}
      {isHelpPopupOpen && <HelpPopup onClose={closeHelpPopup} />}

      {/* Action confirmation dialog - show this on top when an action is confirmed */}
      {actionDialog && (
        <ActionDialog
          message={actionDialog.message}
          onConfirm={actionDialog.onConfirm}
          onCancel={actionDialog.onCancel}
        />
      )}

      {dashboardChatPanelOpen && dashboardChatUser && (
        <ChatPanel
          callId={null}
          userId={user.uid}
          userName={user.uid}
          onCloseChat={() => setDashboardChatPanelOpen(false)}
          dashboardChatUser={dashboardChatUser}
          dashboardMode={true}
        />
      )}

      {/* Contact Selection Modal */}
      <ContactSelectionModal
        isOpen={showContactModal}
        onClose={closeContactModal}
        users={users}
        selectedContacts={selectedContacts}
        onContactToggle={toggleContactSelection}
        onStartCall={startNewCall}
        loading={contactModalLoading}
      />
    </div>
  );
};

export default Dashboard;
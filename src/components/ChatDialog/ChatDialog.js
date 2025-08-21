import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { CHAT_API_URL, API_ENDPOINTS } from '../../services/api/config';
import './ChatDialog.css';

const ChatDialog = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [previousState, setPreviousState] = useState({ expanded: false, maximized: false });
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingDots, setThinkingDots] = useState(0);
  const [messages, setMessages] = useState([{
    content: `Welcome! I'm your medical AI assistant. Here are some examples of what you can ask:

🔍 Query Patient: "Show me patient John Smith's records"

👤 Switch Patient: "Switch to patient ID 12345"

💓 View ECG data: "Display the latest ECG for current patient"

📊 Analyze ECG data: "What's abnormal in this ECG?"

📝 Generate Report: "Create a summary report for this patient"

📥 Export Report: "Export this report as PDF"

❓ Medical Questions: "What are common causes of arrhythmia?"

How may I assist you today?`,
    isUser: false,
    timestamp: new Date().toLocaleTimeString()
  }]);
  const [inputMessage, setInputMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const chatMessages = messagesEndRef.current.parentElement;
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  };

  useEffect(() => {
    // Use setTimeout to ensure scrolling after DOM updates
    setTimeout(scrollToBottom, 100);
  }, [messages]);
  
  // Animation for thinking dots
  useEffect(() => {
    let interval;
    if (isThinking) {
      interval = setInterval(() => {
        setThinkingDots((prev) => (prev + 1) % 3);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isThinking]);

  // Initialize conversation on component mount
  useEffect(() => {
    initializeConversation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeConversation = async () => {
    try {
      const response = await fetch(`${CHAT_API_URL}${API_ENDPOINTS.CHAT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'init',
          conversation_id: null
        }),
      });

      const data = await response.json();
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
        console.log('Initialized conversation_id:', data.conversation_id);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      content: inputMessage,
      isUser: true,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    // Show thinking indicator
    setIsThinking(true);

    try {
      const response = await fetch(`${CHAT_API_URL}${API_ENDPOINTS.CHAT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          conversation_id: conversationId
        }),
      });

      const data = await response.json();
      
      // Hide thinking indicator after response is received
      setIsThinking(false);
      
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      const botMessage = {
        content: data.message || 'Sorry, I could not process your request.',
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Hide thinking indicator on error
      setIsThinking(false);
      
      const errorMessage = {
        content: 'Sorry, there was an error processing your message.',
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (content) => {
    if (typeof content !== 'string') return { __html: '' };
    return { __html: marked(content) };
  };

  return (
    <div className={`chat-dialog ${isExpanded ? 'expanded' : 'collapsed'} ${isMaximized ? 'maximized' : ''}`}>
      <div className="chat-header">
        <span>Chat Assistant</span>
        <div className="header-buttons">
          <button 
            className="header-button" 
            onClick={() => {
              if (!isExpanded) return; // Can only maximize when expanded
              setIsMaximized(!isMaximized);
            }}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? '❐' : '⛶'}
          </button>
          <button 
            className="header-button" 
            onClick={() => {
              if (isExpanded) {
                // When minimizing, save the current state
                setPreviousState({ expanded: true, maximized: isMaximized });
                setIsExpanded(false);
                setIsMaximized(false);
              } else {
                // When expanding, restore the previous state
                setIsExpanded(true);
                setIsMaximized(previousState.maximized);
              }
            }}
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? '−' : '⬆'}
          </button>
        </div>
      </div>
      {isExpanded && (
        <>
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.isUser ? 'user-message' : 'bot-message'}`}
              >
                {message.isUser ? (
                  <div className="message-content">{message.content}</div>
                ) : (
                  <div 
                    className="message-content"
                    dangerouslySetInnerHTML={renderMessage(message.content)}
                  />
                )}
                <div className="message-timestamp">{message.timestamp}</div>
              </div>
            ))}
            {isThinking && (
              <div className="message bot-message thinking-message">
                <div className="message-content">
                  <div className="thinking-indicator">
                    <span>Assistant is thinking</span>
                    <span className="thinking-dots">
                      {thinkingDots === 0 && '● ○ ○'}
                      {thinkingDots === 1 && '○ ● ○'}
                      {thinkingDots === 2 && '○ ○ ●'}
                    </span>
                  </div>
                </div>
                <div className="message-timestamp">{new Date().toLocaleTimeString()}</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatDialog;

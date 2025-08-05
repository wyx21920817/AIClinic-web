import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import './ChatDialog.css';

const ChatDialog = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState([]);
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
    // 使用 setTimeout 确保在 DOM 更新后滚动
    setTimeout(scrollToBottom, 100);
  }, [messages]);

  // Initialize conversation on component mount
  useEffect(() => {
    initializeConversation();
  }, []);

  const initializeConversation = async () => {
    try {
      const response = await fetch('http://52.63.231.27:8888/api/chat', {
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

    try {
      const response = await fetch('http://52.63.231.27:8888/api/chat', {
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
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? '❐' : '⛶'}
          </button>
          <button 
            className="header-button" 
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? '−' : '+'}
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

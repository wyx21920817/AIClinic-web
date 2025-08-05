import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import './ChatDialog.css';

interface Message {
  content: string;
  isUser: boolean;
  timestamp: string;
}

const ChatDialog: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
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

    const userMessage: Message = {
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

      const botMessage: Message = {
        content: data.message || 'Sorry, I could not process your request.',
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        content: 'Sorry, there was an error processing your message.',
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (content: string) => {
    if (typeof content !== 'string') return { __html: '' };
    return { __html: marked(content) as string };
  };

  return (
    <div className={`chat-dialog ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="chat-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span>Chat Assistant</span>
        <button className="toggle-button">
          {isExpanded ? '−' : '+'}
        </button>
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
              placeholder="输入消息..."
            />
            <button onClick={handleSendMessage}>发送</button>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatDialog;

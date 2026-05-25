import React from 'react';
import { User, Bot, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const ChatMessage = ({ message }) => {
  const isUser = message.isUser === true;
  const hasError = message.error;

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageText = (text) => {
    if (!text) return null;
    
    // Convert markdown-style formatting to HTML
    let inList = false;
    let listHtml = '';
    
    const formattedText = text
      .split('\n')
      .map((line, idx) => {
        // Bold text
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
        
        // Italic text
        line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // Bullet points
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ') || line.trim().startsWith('* ')) {
          if (!inList) {
            inList = true;
            listHtml = '<ul class="list-disc ml-6 my-2 space-y-1">';
          }
          const content = line.trim().substring(2).replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
          listHtml += `<li>${content}</li>`;
          return null;
        } else if (inList) {
          inList = false;
          const result = listHtml + '</ul>';
          listHtml = '';
          return result + (line.trim() ? `<br />${line}` : '');
        }
        
        // Numbered lists
        if (/^\d+\.\s/.test(line.trim())) {
          const content = line.trim().replace(/^\d+\.\s/, '').replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
          return `<li class="ml-6">${content}</li>`;
        }
        
        return line;
      })
      .filter(line => line !== null)
      .join('<br />');

    // Close any open list
    const finalText = inList ? formattedText + listHtml + '</ul>' : formattedText;

    return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: finalText }} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
      }`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <Card className={`p-3 ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : hasError 
            ? 'bg-destructive/10 text-destructive border-destructive/20' 
            : 'bg-muted'
        }`}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.message}</p>
          ) : (
            <div className="space-y-2">
              {hasError && (
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-semibold">Error</span>
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap">
                {formatMessageText(message.response)}
              </div>
              {message.context && message.context.active_alerts && message.context.active_alerts.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/20">
                  <p className="text-xs font-semibold mb-1">Context:</p>
                  <div className="flex flex-wrap gap-1">
                    {message.context.active_alerts.map((alert, idx) => (
                      <Badge key={idx} variant="destructive" className="text-xs">
                        {alert.severity}: {alert.location}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
        <span className="text-xs text-muted-foreground px-1">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
};

export default ChatMessage;
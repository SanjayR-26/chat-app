import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface ChatMessage {
  type: 'in' | 'out';
  Message: string;
  // ... other properties
}

@Injectable({
  providedIn: 'root'
})
export class ChatInnerService {

  readonly apiUrl: string = 'https://demanual-wealth-director-backend.vercel.app/';

  clientMsgSub = new BehaviorSubject<any>([]);
  clientMsgSub$: Observable<any> = this.clientMsgSub.asObservable();
  clientSessionDetArr = signal<any>([]);


  constructor(private http: HttpClient) { }

  getClientMsg() {
    return this.clientMsgSub.getValue();
  }

  setClientMsg(value: any) {
    this.clientMsgSub.next(value);
  }

  getClientChatActiveSession(clientId: number) {
    return this.http.get<any>(this.apiUrl + `clients/${clientId}/active-sessions`);
  }

  getClientChatMsg(clientSessionDet: any) {
    console.log('ser');
    console.log(clientSessionDet);

    console.log('array check', Array.isArray(clientSessionDet));
    let sessionDet: any;
    if (clientSessionDet.session_id) {
      sessionDet = clientSessionDet;
      this.clientSessionDetArr.set(sessionDet);
    } else {
      sessionDet = clientSessionDet?.session;
      sessionDet['session_id'] = sessionDet.Id;
      sessionDet['session_token'] = sessionDet.SessionToken;
      this.clientSessionDetArr.set(sessionDet);
    }
    return this.http.get(this.apiUrl + `session/${sessionDet?.session_id}/messages`);
  }

  getChathistoryMsg(sessionId: number) {
    return this.http.get(this.apiUrl + `session/${sessionId}/messages`);
  }

  createNewChatSession(clientId: number) {
    const postData = {
      ClientId: clientId
    }
    return this.http.post(this.apiUrl + `chat-sessions`, postData);
  }

  postChat(chatArr: any) {
    return this.http.post(this.apiUrl + 'chat', chatArr)
  }

  closeChatSession(sessionToken: string) {
    return this.http.delete(this.apiUrl + `sessions/${sessionToken}/close`);
  }

  getChatHistory(clientId: number) {
    return this.http.get(this.apiUrl + `client/${clientId}/sessions`);
  }

  /**
   * Formats API message content to properly display in the UI
   * - Converts markdown-style headings (**text**) to HTML h-tags
   * - Preserves line breaks using CSS white-space
   * - Structures content for better readability
   * @param message Raw message content from API
   * @returns Formatted HTML string ready for display
   */
  formatMessageContent(message: string): string {
    if (!message) return '';
    
    try {
      // Parse JSON if message is in JSON format with a Message property
      let messageContent = message;
      try {
        const parsedMessage = JSON.parse(message);
        if (parsedMessage && parsedMessage.Message) {
          messageContent = parsedMessage.Message;
        }
      } catch (e) {
        // Not JSON or JSON without Message property, use original message
      }

      // Apply consistent styling to the entire content
      let formattedContent = `<div style="line-height: 1.6; font-size: 14px;">`;
      
      // First, replace double line breaks with a special marker
      messageContent = messageContent.replace(/\n\n+/g, '§PARAGRAPH§');
      
      // Replace single line breaks with a line break marker
      messageContent = messageContent.replace(/\n/g, '§LINEBREAK§');
      
      // Process markdown headers
      messageContent = messageContent.replace(/\*\*(.*?)\*\*/g, '§H3§$1§/H3§');
      
      // Process bullet points
      messageContent = messageContent.replace(/^- (.*?)$/gm, '§BULLET§$1§/BULLET§');
      
      // Convert paragraphs into proper HTML with spacing
      messageContent = messageContent.replace(/§PARAGRAPH§/g, '</p><p style="margin: 1em 0;">');
      
      // Convert line breaks
      messageContent = messageContent.replace(/§LINEBREAK§/g, '<br>');
      
      // Convert h3 tags with proper spacing
      messageContent = messageContent.replace(/§H3§(.*?)§\/H3§/g, 
        '</p><h3 style="margin: 1.5em 0 0.5em 0; color: #181C32; font-size: 1.2em;">$1</h3><p style="margin: 0.5em 0;">'
      );
      
      // Convert bullets with proper spacing
      messageContent = messageContent.replace(/§BULLET§(.*?)§\/BULLET§/g, 
        '<div style="margin: 0.4em 0 0.4em 1em; display: flex;"><span style="margin-right: 0.5em;">•</span><span>$1</span></div>'
      );
      
      // Wrap in a paragraph if not already
      if (!messageContent.startsWith('</p>')) {
        messageContent = '<p style="margin: 0.5em 0;">' + messageContent;
      }
      if (!messageContent.endsWith('</p>')) {
        messageContent += '</p>';
      }
      
      // Clean up any empty paragraphs
      messageContent = messageContent.replace(/<p style="margin: 0.5em 0;"><\/p>/g, '');
      
      // Close the div
      formattedContent += messageContent + '</div>';
      
      return formattedContent;
      
    } catch (error) {
      console.error('Error formatting message:', error);
      return message; // Return original message in case of error
    }
  }

  timeAgo(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'a few seconds ago';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      const dayStr = (diffInDays < 10) ? 'day' : 'days';
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
  }

  getMessageCssClass(message: ChatMessage): string {
    return `p-5 rounded kt_drawer_chatbg bg-light-${message.type === 'in' ? 'infoinfochat' : 'primary'} 
      text-${message.type === 'in' ? 'start' : 'end'} message-content`;
  }
}

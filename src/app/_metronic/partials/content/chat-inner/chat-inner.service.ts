import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
}

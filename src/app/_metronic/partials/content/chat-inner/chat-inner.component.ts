import {
  Component,
  computed,
  ElementRef,
  HostBinding,
  inject,
  Input,
  OnChanges,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { BehaviorSubject, iif, Observable, retry, switchMap, tap } from 'rxjs';
import {
  defaultMessages,
  defaultUserInfos,
  messageFromClient,
  MessageModel,
  UserInfoModel,
} from './dataExample';
import { ChatInnerService } from './chat-inner.service';

@Component({
  selector: 'app-chat-inner',
  templateUrl: './chat-inner.component.html',
})
export class ChatInnerComponent implements OnInit, OnChanges {

  clientDet: any = { // Todo: Need to update with dynamic data
    clientId: 1,
    name: 'John Doe',
    nickname: 'John'
  }
  chatMsgList = signal<any>([]);
  chatHistory = signal<any>([]);
  chatInnerService = inject(ChatInnerService);
  showLoading = signal<boolean>(true);
  submitMsgDisable = signal<boolean>(false);
  submitMsgText = signal<string>('Send');
  showChatTxtArea = signal<boolean>(true);
  private _textareaValue = signal<string>('');
  textareaValue: any = computed(() => this._textareaValue());

  @Input() isDrawer: boolean = false;
  @Input() showChatHistory: boolean = false;
  @HostBinding('class') class = 'card-body';
  @HostBinding('id') id = this.isDrawer
    ? 'kt_drawer_chat_messenger_body'
    : 'kt_chat_messenger_body';
  // @ViewChild('messageInput', { static: true })
  // messageInput: ElementRef<HTMLTextAreaElement>;
  messageInput: string = '';

  private messages$: BehaviorSubject<Array<MessageModel>> = new BehaviorSubject<
    Array<MessageModel>
  >(defaultMessages);
  messagesObs: Observable<Array<any>>;

  constructor() {
    this.messagesObs = this.messages$.asObservable();
  }

  ngOnInit(): void {
    this.createChatSession();
    this.getChatHistory();
  }

  ngOnChanges(changes: any) {
    if (changes['showChatHistory']) {
      if (!this.showChatHistory) {
        this.chatMsgList.set([]);
      }
    }
  }

  createChatSession(retry?: boolean) {
    this.chatInnerService.getClientChatActiveSession(this.clientDet.clientId)
      .pipe(
        switchMap(activeChatSession => {
          if (!activeChatSession.length) {
            return this.chatInnerService.createNewChatSession(this.clientDet.clientId)
          } else if ((activeChatSession && activeChatSession.length > 0) && !activeChatSession[0].existing) {
            // If existing is false, create new chat
            return this.chatInnerService.createNewChatSession(this.clientDet.clientId);
          }
          else {
            // If inMemory is true, return response
            console.log('activeChatSession', activeChatSession);
            return activeChatSession;
          }
        })
      )
      .pipe(
        switchMap(response => { console.log('final', response); return this.chatInnerService.getClientChatMsg(response) })
      )
      .subscribe(
        response => {
          console.log('Chat flow completed:', response);
          this.getClientMsg(response);
          if (retry) {
            this.submitMessage();
          }
          this.showLoading.set(false);
        },
        error => console.log('Error in chat flow:', error)
      );
  }

  getClientMsg(msgDetArr: any) {
    msgDetArr.filter((val: any) => {
      val.time = this.chatInnerService.timeAgo(val.CreatedAt);
      val.type = (val.MessageType === 'user') ? 'out' : 'in';
      val.user = val.ClientId;
      val.avatar = (val.MessageType === 'user') ? '300-1.jpg' : '300-25.jpg';
    });
    console.log(msgDetArr);

    this.chatMsgList.set(msgDetArr);
  }

  submitMessage(): void {
    this.submitMsgDisable.set(true);
    this.submitMsgText.set('Please Wait...');
    const text = this.messageInput.trim();
    const newMessage: any = {
      ClientId: this.clientDet.clientId,
      SessionId: this.chatInnerService.clientSessionDetArr().session_id,
      Message: text,
      SessionToken: this.chatInnerService.clientSessionDetArr().session_token
    };
    this.chatInnerService.postChat(newMessage)
      .subscribe(res => {
        this.addChatMsg(res);
        this.messageInput = '';
        this.submitMsgDisable.set(false);
        this.submitMsgText.set('Send');
      },
        (error) => {
          console.log('Error occurred', error);
          // this.retryErrMsg(newMessage);
          this.createChatSession(true);
        });
  }

  retryErrMsg(msgdata: any) {
    this.chatInnerService.createNewChatSession(this.clientDet.clientId).
      subscribe((res) => {
        console.log('retry res', res);
      })
  }

  addChatMsg(chatRes: any) {
    const usrMSg = {
      Id: chatRes.user_message.Id,
      SessionId: chatRes.user_message.SessionId,
      ClientId: this.clientDet.clientId,
      Message: chatRes.user_message.Message,
      MessageType: "user",
      CreatedAt: chatRes.user_message.CreatedAt,
      time: this.chatInnerService.timeAgo(chatRes.user_message.CreatedAt),
      type: "out",
      user: this.clientDet.clientId,
      avatar: "300-1.jpg"
    };
    const aiMSg = {
      Id: chatRes.ai_response.Id,
      SessionId: chatRes.ai_response.SessionId,
      ClientId: this.clientDet.clientId,
      Message: chatRes.ai_response.Message,
      MessageType: "AI",
      CreatedAt: chatRes.ai_response.CreatedAt,
      time: this.chatInnerService.timeAgo(chatRes.ai_response.CreatedAt),
      type: "in",
      user: this.clientDet.clientId,
      avatar: "300-25.jpg"
    };
    this.chatMsgList.update(val => [
      ...val,
      usrMSg,
      aiMSg
    ])
  }

  addMessage(newMessage: MessageModel): void {
    const messages = [...this.messages$.value];
    messages.push(newMessage);
    this.messages$.next(messages);
  }

  getUser(user: number): UserInfoModel {
    return defaultUserInfos[user];
  }

  getMessageCssClass(message: MessageModel): string {
    return `p-5 rounded text-gray-900 fw-bold mw-lg-400px bg-light-${message.type === 'in' ? 'info' : 'primary'
      } text-${message.type === 'in' ? 'start' : 'end'}`;
  }

  getChatHistory() {
    this.showLoading.set(true);
    let chatHisArr: any = [];
    this.chatInnerService.getChatHistory(this.clientDet.clientId)
      .subscribe(res => {
        chatHisArr = res;
        chatHisArr.filter((val: any) => {
          const date = new Date(val.CreatedAt);
          val.CreatedAt = date.toLocaleString();
        }).reverse().pop();
        console.log('chatHisArr', chatHisArr);
        this.chatHistory.set(chatHisArr);
        this.showLoading.set(false);
      });
  }

  loadChatHisMsg(sessionId: number) {
    this.chatInnerService.getChathistoryMsg(sessionId)
      .subscribe(res => {
        console.log(res);
        this.getClientMsg(res);
      },
        error => console.log('Something went wrong - ' + error.message))
  }


}

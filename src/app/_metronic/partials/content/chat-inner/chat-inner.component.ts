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
    this.testFormatting(); // Test the formatting function
  }

  ngOnChanges(changes: any) {
    if (changes['showChatHistory']) {
      if (!this.showChatHistory) {
        this.chatMsgList.set([]);
      }
    }
  }

  createChatSession(retry?: boolean) {
    // Store existing messages if this is a retry
    const existingMessages = retry ? this.chatMsgList() : [];
    
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
          
          // If this is a retry, restore existing messages first
          if (retry && existingMessages.length > 0) {
            this.chatMsgList.set(existingMessages);
          }
          
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
      
      // Format AI messages for better display
      if (val.MessageType !== 'user') {
        val.Message = this.chatInnerService.formatMessageContent(val.Message);
      }
    });
    console.log(msgDetArr);

    // Instead of replacing all messages, we need to check if this is a retry
    // If it's a new session load, we set messages, otherwise we merge them
    const currentMessages = this.chatMsgList();
    
    // Check if we're loading initial messages or refreshing session
    if (currentMessages.length === 0 || this.showChatHistory) {
      // Initial load or history request - replace messages
      this.chatMsgList.set(msgDetArr);
    } else {
      // We already have messages, so we need to merge them without duplicates
      // First, create a map of existing message IDs
      const existingMsgIds = new Map(currentMessages.map((msg: any) => [msg.Id, true]));
      
      // Filter out messages that already exist in the chat
      const newMessages = msgDetArr.filter((msg: any) => !existingMsgIds.has(msg.Id));
      
      // Add only new messages to the existing chat
      if (newMessages.length > 0) {
        this.chatMsgList.update(val => [...val, ...newMessages]);
      }
    }
  }

  submitMessage(): void {
    this.submitMsgDisable.set(true);
    this.submitMsgText.set('Please Wait...');
    const text = this.messageInput.trim();
    
    // Store the current message to retry if needed
    const currentInputMessage = text;
    
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
          
          // Save the message input to be reused after session refresh
          const savedMessageInput = this.messageInput;
          
          // Create a new session but preserve existing messages
          this.createChatSession(true);
          
          // Restore the message input that was being sent
          this.messageInput = savedMessageInput;
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
      Message: this.chatInnerService.formatMessageContent(chatRes.ai_response.Message),
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
    return `p-5 rounded kt_drawer_chatbg bg-light-${message.type === 'in' ? 'infoinfochat' : 'primary'
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

  // Test the message formatting function with sample data
  testFormatting(): void {
    const testMessage = JSON.stringify({
      "Message": "The Wealth Director platform is a comprehensive financial management tool designed to help users understand and improve their financial health. It offers clear insights, easy tracking, and personalized advice. The platform is suitable for new users (prospects), paying clients, and financial advisors.\n\n**Key Features & Benefits:**\n- **For Prospects (New Users):**\n  - General Information Entry: Quickly provide basic details to get started.\n  - Goal & Portfolio Overview: Set financial goals and get a snapshot of your current assets.\n  - Financial & Life Event Tracking: Track important financial milestones and life events.\n  - Benefit: Easy and risk-free way to see how the platform can help improve your financial health.\n\n- **For Clients (Paying Users):**\n  - Detailed Financial Data Entry: Enter comprehensive details about income, spending, assets, and debts.\n  - Detailed Reports: Cover spending, income, portfolio performance, and goal progress.\n  - Benefit: Stay updated on your financial status without extra effort.\n\n**Unique Selling Points (USPs):**\n- All-in-One Financial Management: Combine tracking of spending, income, portfolio, and life events in a single, easy-to-use platform.\n- Personalized Dashboards & Reports: Get tailored financial insights and reports that are easy to understand.\n- Expert Financial Advice: Benefit from professional insights through financial advisors who use the platform to offer personalized advice.\n- User-Friendly Interface: Simple design that works well for both new users and experienced clients.\n\n**Use Cases:**\n- **For a New User (Prospect):** Quickly enter basic information, set financial goals, and start tracking spending and income.\n- **For a Paying Client:** Access a personalized dashboard with a clear view of financial score, income, spending, and progress towards life goals.\n- **For a Financial Advisor:** Analyze client data and provide expert advice."
    });
    
    console.log('Original Message:', JSON.parse(testMessage).Message);
    console.log('Formatted Message:', this.chatInnerService.formatMessageContent(testMessage));
    
    // Add a test message to the chat list for visual confirmation
    if (this.chatMsgList().length === 0) {
      const testAiMsg = {
        Id: '999',
        SessionId: '1',
        ClientId: this.clientDet.clientId,
        Message: this.chatInnerService.formatMessageContent(testMessage),
        MessageType: "AI",
        CreatedAt: new Date().toISOString(),
        time: 'just now',
        type: "in",
        user: this.clientDet.clientId,
        avatar: "300-25.jpg"
      };
      this.chatMsgList.update(val => [...val, testAiMsg]);
    }
  }

  // Update the method to not require an event parameter
  onEnterKeyDown(): void {
    // No need for event.preventDefault() since we're not using the event
    if (!this.submitMsgDisable() && this.messageInput.trim()) {
      this.submitMessage();
    }
  }

}

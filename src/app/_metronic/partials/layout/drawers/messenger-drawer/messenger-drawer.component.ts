import { Component, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-messenger-drawer',
  templateUrl: './messenger-drawer.component.html',
})
export class MessengerDrawerComponent implements OnInit {
  constructor() { }

  showChatHistory = signal<boolean>(false);

  ngOnInit(): void { }

  toggleChatHistroy() {
    this.showChatHistory.update(val => !val);
    console.log('chat his clicked', this.showChatHistory());
  }
}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { MessengerDrawerComponent } from './messenger-drawer/messenger-drawer.component';
import { ChatInnerModule } from '../../content/chat-inner/chat-inner.module';

@NgModule({
  declarations: [
    MessengerDrawerComponent
  ],
  imports: [CommonModule, InlineSVGModule, RouterModule, ChatInnerModule],
  exports: [
    MessengerDrawerComponent
  ],
})
export class DrawersModule { }

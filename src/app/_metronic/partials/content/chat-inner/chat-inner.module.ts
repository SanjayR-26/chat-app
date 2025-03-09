import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { ChatInnerComponent } from './chat-inner.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [ChatInnerComponent],
  imports: [CommonModule, FormsModule, InlineSVGModule],
  exports: [ChatInnerComponent],
})
export class ChatInnerModule { }

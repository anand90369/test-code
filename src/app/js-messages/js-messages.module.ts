import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { JsMessagesRoutingModule } from './js-messages-routing.module';
import { JsMessagesHomeComponent } from './js-messages-home/js-messages-home.component';
import { ConversationsComponent } from './js-messages-home/conversations/conversations.component';


@NgModule({
  declarations: [JsMessagesHomeComponent, ConversationsComponent],
  imports: [
    CommonModule,
    JsMessagesRoutingModule
  ]
})
export class JsMessagesModule { }

import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { JsMessagesModule } from './js-messages/js-messages.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    JsMessagesModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { JsMessagesHomeComponent } from './js-messages-home/js-messages-home.component';

const routes: Routes = [
  {
    path: '',
    component: JsMessagesHomeComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class JsMessagesRoutingModule { }

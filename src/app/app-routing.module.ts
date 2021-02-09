import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
const routes: Routes = [
  {
    path: 'messages',
    loadChildren: './js-messages/js-messages.module#JsMessagesModule'
  },
  {
    path: '',
    loadChildren: './modules/js-messages/js-messages.module#JsMessagesModule'
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

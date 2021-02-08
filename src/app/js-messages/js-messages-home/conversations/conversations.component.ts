import {
  Component, ElementRef, Input, OnDestroy, OnInit, Output, EventEmitter,
  PLATFORM_ID, Renderer2, Inject, ViewEncapsulation, TemplateRef, OnChanges, ViewChild, AfterViewChecked
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AngularFireDatabase } from 'angularfire2/database';
import { AngularFirestore } from 'angularfire2/firestore';
import { AngularFireStorage } from 'angularfire2/storage';
import * as moment from 'moment';
import * as momentTimezone from 'moment-timezone';
import { map, switchMap, take } from 'rxjs/operators';
import { ChatService } from '../../../../../providers/chat.service';
import { SubSink } from 'subsink';
import * as firebase from 'firebase/app';
import { combineLatest, Observable, of } from 'rxjs';
import { BsModalRef, BsModalService } from 'ngx-bootstrap';


@Component({
  selector: 'app-conversations',
  templateUrl: './conversations.component.html',
  styleUrls: ['./conversations.component.scss', '../js-messages-home.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ConversationsComponent implements OnInit, OnDestroy, OnChanges {


  @Input('messages') _messages;
  @Input('conversation') conversation;
  @Input('updatedConversation') updatedConversation;
  @Input('newReceiver') newReceiver;
  @Input() showContacts: Boolean;
  @Input() isMobile: Boolean;
  @Input() showMobileChat: Boolean;
  @Input() initArchive: Boolean;
  @Input('newChatId') newChatId;
  @Input('groupSelectedUsers') groupSelectedUsers;
  @Input('closeListOnGroupDets') closeListOnGroupDets;
  @Input('newGroup') newGroup;
  // @Input('userAddtionInGroup') userAddtionInGroup;
  @Output() mobileChat: EventEmitter<any> = new EventEmitter<any>();
  @Output() onNewMsgSent: EventEmitter<any> = new EventEmitter<any>();
  @Output() onGroupDetails: EventEmitter<any> = new EventEmitter<any>();
  @Output() onNewContact: EventEmitter<any> = new EventEmitter<any>();


  @ViewChild('scrollMe') private myScrollContainer: ElementRef;
  disableScrollDown = false
  public allMessages = [];
  typeMessage: any;
  private subs = new SubSink();
  private subs2 = new SubSink();
  private subs3 = new SubSink();
  reciever;
  modalRef: BsModalRef;
  matMenuState: Boolean = false;
  showBookMarkStatus: Boolean = false;
  isMatMenuOpen: Boolean;
  basicUserDetails;
  showAttachmentPreview;
  userAddtionInGroup:Boolean = false;
  userDeletionInGroup:Boolean = false;
  private sender;
  public room;
  public chatInfo;
  private loadMore;
  public loadingMessages = false;
  public userData;
  public sendMsgSetting;
  selectedGroupNames;
  groupName = '';
  grouping: Boolean = false;
  addOnUserinGroup;
  deleteUserinGroup;
  conversationSub;
  noMessages: any;
  public forwardMsg;
  public sendingMessage = false;
  fileLoading: Boolean = false;
  sendActive: Boolean=false;
  toggleEmoji: boolean = false;
  showGroupDetails: Boolean = false;

  constructor(@Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) private platformId: Object,
    private storage: AngularFireStorage,
    private angularFirestore: AngularFirestore,
    private db: AngularFireDatabase,
    private modalService: BsModalService,
    private chatService: ChatService,
    private router: Router
  ) { }

  menuState() {
    this.matMenuState = !this.matMenuState;
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.renderer.addClass(this.document.body, 'noScroll');
    }
    this.sender = {};
    this.sender.uid = localStorage.getItem('fbUserUid');
    var sendername = JSON.parse(localStorage.getItem('loggedUser'));
    console.log(sendername);
    this.sender.name = sendername['name'];
    console.log('sender', this.sender);

    this.initEmoji();

    this.subs3.sink = this.db.object(`Users/${this.sender.uid}`).valueChanges().subscribe(res => {
      this.userData = res;
    });

    this.db.object(`Users/${this.sender.uid}/sendmsgOnEnter`).valueChanges().subscribe(res => {
      this.sendMsgSetting = res;
    });

    this.chatService.currentAction.subscribe(act => {
      this.userAddtionInGroup = act;
      if(this.userAddtionInGroup === true) {
        this.addOnUserinGroup = true;
        setTimeout(() => {
          this.addOnUserinGroup = false;
        }, 2500);
      }
    });

    this.chatService.deleteAction.subscribe(act => {
      this.userDeletionInGroup = act;
      console.log('this', this.userDeletionInGroup);
      if(this.userDeletionInGroup === true) {
        this.deleteUserinGroup = true;
        setTimeout(() => {
          this.deleteUserinGroup = false;
          this.userDeletionInGroup = false;
        }, 2500);
      }
    });

    // const events = firebase.firestore().collection('UserDetails')
    // events.get().then((querySnapshot) => {
    //     const tempDoc = []
    //     querySnapshot.forEach((doc) => {
    //       if(doc.data()['uid'] === this.sender.uid) {
    //        tempDoc.push({ id: doc.id, ...doc.data() })
    //       }
    //     })
    //     this.userData = tempDoc[0];
    //     console.log('User Data', this.userData);
    //  });

    this.reciever = null;
    this.newChatId = false;
    // const collectionRef = this.angularFirestore.collection('users').doc(this.sender.uid);

    // this.subs.sink = collectionRef.valueChanges().subscribe((room: any) => {
    //   // this.reciever = null;
    //   this.clear();
    //   this.room = room;
    //   console.log('Room', this.room);
    //   console.log('Room Reciever', this.reciever);
    //   if (room && room.roomId) {
    //     // this.loadingMessages = true;
    //     this.getRoom(room);
    //   }

    //   if (room && !room.roomId) {
    //     this.room = null;
    //     this.reciever = null;
    //     console.log('No Room', this.room);
    //     console.log('No Room Reciever', this.reciever);
    //   }

    // });
  }

  ngOnChanges(changes) {

    if(this.closeListOnGroupDets) {
      this.showGroupDetails = this.closeListOnGroupDets;
    }
    console.log('showContacts', this.showContacts, 'Reciever', this.reciever, 'NewChatId', this.newChatId);
    if((this.showContacts === true && !this.newChatId) || (this.groupSelectedUsers.length > 1)) {
      // if(this.showContacts === true && !this.newChatId) {
      this.reciever = null;
      // this.angularFirestore.collection('users').doc(this.sender.uid).set({
      //   roomId: null,
      //   type: 'user'
      // }, { merge: true });
      console.log('rec chang', this.reciever, 'chan showc', this.showContacts);
    }

    if (this.conversation === null && this.newReceiver === null && this.groupSelectedUsers.length === 0) {
      console.log('No Receiver');
      this.reciever = null;
    }
    if (this.groupSelectedUsers.length > 1 || changes.newGroup === true ) {
      console.log('Grouping', changes.newGroup);
      this.grouping = true;
    } else {
      this.grouping = false;
    }


    // New
    console.log('Changes', changes)
    console.log('Conversation Changes', this.conversation);
    // if(((changes.conversation && changes.conversation.currentValue !== undefined &&
    //     changes.conversation.currentValue !== null) || this.newReceiver || this.reciever ) && !this.grouping) {
      if((changes.conversation || this.newReceiver || this.reciever ) && !this.grouping) {
        console.log('Conversation Changes', changes.conversation);
        if( !changes.conversation && (this.conversation.id === this.chatInfo.id) ) {
          console.log('Samee');
          return;
        }
      this.clear();
      console.log('ChatInfo', this.chatInfo);
      // this.chatInfo = this.conversation;
      // this.conversation && this.getMessages(this.conversation.id);
      this.conversation && this.getConversation(changes.conversation);
      if (this.newReceiver) {
        console.log('New Receiver', this.newReceiver);
        this.reciever = this.newReceiver;
        this.showContacts = false;
        this.newChatId = true;
      } else {
        console.log('Not New Receiver', this.newReceiver);
        // this.reciever = this.chatInfo.mainParticipant;
      }
      console.log('COnversation in conTs', this.conversation, 'Receiver', this.reciever);
      this.showContacts = false;
    } else if(this.groupSelectedUsers.length > 1 && this.newGroup) {
      console.log('grups', changes);
      this.chatInfo = null;
      this.newReceiver = null;
      this.selectedGroupNames = this.groupSelectedUsers.map(e => {
        var a = e['name'];
        return a[0].toUpperCase() + a.substr(1).toLowerCase();
      });
      console.log('More', this.selectedGroupNames);
      console.log('String Data', this.selectedGroupNames.toString());
      if(this.groupSelectedUsers.length > 1) {
        console.log('SC in More', this.showContacts, 'NC in More', this.newChatId);
        this.newChatId = true;
        this.showContacts = false;
      } else {
        this.newChatId = false;
      }
      console.log('Selected users', this.groupSelectedUsers, 'Conversation', this.conversation);
      console.log('Reciever in group', this.reciever, 'Show Contats in group', this.showContacts);
      console.log('NewChatId in group', this.newChatId, 'New Reciever in group', this.newReceiver);
    } else {
      console.log('No users', this.groupSelectedUsers, 'Conversation', this.conversation);
      console.log('Reciever', this.reciever, 'Show Contats', this.showContacts);
      console.log('NewChatId', this.newChatId, 'Show Contats', this.newReceiver);
    }

    // if(changes.conversation) {
    //   this.clear();
    //   // this.chatInfo = this.conversation;
    //   // this.reciever = this.chatInfo.mainParticipant;
    //   // if (this.newReceiver) {
    //   //       console.log('New Receiver', this.newReceiver);
    //   //       this.reciever = this.newReceiver;
    //   //       this.showContacts = false;
    //   //       this.newChatId = true;
    //   //   } else {
    //   //     console.log('Not New Receiver', this.newReceiver);
    //   //     this.reciever = this.chatInfo.mainParticipant;
    //   // }
    //   console.log('Changes', this.chatInfo, this.reciever);
    //   // this.conversation && this.getMessages(this.conversation.id);
    //   this.conversation && this.getConversation(changes.conversation);
    // } else {
    //   console.log('No Conversation Changes')
    // }
  }

  getConversation(conversation){
    this.loadingMessages = true;
    if(this.conversationSub){
      this.conversationSub.unsubscribe();
    }

    console.log(conversation);
    console.log(this.conversation.id);
    this.conversationSub = this.angularFirestore.collection('conversations')
      .doc(this.conversation.id)
      .valueChanges()
      .subscribe(chatInfo => {

        this.chatInfo = chatInfo;
        console.log('ChatInfooooooooo', this.chatInfo);
        // const mainParticipantUid = this.chatInfo.participants_uid[0] !== this.sender.uid ? this.chatInfo.participants_uid[0] : this.chatInfo.participants_uid[1];
        // let mainParticipant = this.chatInfo.participants[mainParticipantUid];
        // this.reciever = { uid: mainParticipantUid, ...mainParticipant };
        this.reciever = this.conversation.mainParticipant;
        console.log('Receiver', this.reciever);
        this.getMessages(this.conversation.id);
      });
  }

  openDeleteConfirmWindow(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template, { class: 'modal-dialog-centered modal-sm', ignoreBackdropClick: true });
  }

  // private async getRoom({ roomId }) {
  //   const chatInfo = await this.angularFirestore.firestore.collection('users').doc(this.sender.uid)
  //     .collection('conversations').doc(roomId).get();
  //   this.chatInfo = { ...chatInfo.data(), id: chatInfo.id };
  //   this.db.object('Users/' + this.chatInfo.id).valueChanges().subscribe(user => {
  //     this.reciever = user;
  //     console.log('ChatInfo', this.chatInfo);
  //     console.log('Reciever', this.reciever);
  //   });
    // this.angularFirestore.collection('UserDetails').doc(this.chatInfo.id).valueChanges().subscribe(res => {
    //   this.reciever = res;
    //   console.log('Reciever', this.reciever);
    // });

  getPublicUrl() {
    if(this.basicUserDetails.map.userBasicDetailsVos.length !== 0) {
      this.router.navigate(['profile'+ this.basicUserDetails.map.userBasicDetailsVos[0].publicUrl]);
    } else {
      return;
    }
  }

  private clear() {
    this.subs2.unsubscribe();
    this.subs.unsubscribe();
    // this.loadingTopDone = false;
    // this.loadingTop = false;
    this.reciever = null;
    this.typeMessage = '';
    this.toggleEmoji = false;
    document.getElementById("inline-editor2").innerText = '';
    this.forwardMsg = '';
    this.allMessages = [];
  }

//   private onScroll() {
//     console.log('Scroll');
//     let element = this.myScrollContainer.nativeElement
//     let atBottom = element.scrollHeight - element.scrollTop === element.clientHeight
//     if (this.disableScrollDown && atBottom) {
//         this.disableScrollDown = false
//     } else {
//         this.disableScrollDown = true
//     }
// }

// private scrollToBottom(): void {
//   if (this.disableScrollDown) {
//       return
//   }
//   try {
//       this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
//   } catch(err) { }
// }

// ngAfterViewChecked() {
//   this.scrollToBottom();
// }

  // public loadingTop = false;
  // public loadingTopDone = false;
  // private checkTop() {
  //   // this.subs2.sink = this.componentRef.directiveRef.psYReachStart.subscribe(() => {
  //   if (!this.loadingTop && !this.loadingTopDone) {
  //     console.log('Loading top');
  //     this.loadMoreMessages()
  //   }
  //   // });
  // }

  // private loadMoreMessages() {
  //   this.loadingTop = true;
  //   const limit = 10;
  //   const roomId = this.room.roomId;
  //   const fs = this.angularFirestore;
  //   const startedFromId = this.allMessages[0].id;

  //   const collection = fs.collection('users').doc(this.sender.uid).collection('conversations').doc(roomId).collection('messages', ref => ref.where('room', '==', roomId).orderBy('date')
  //     .endBefore(this.allMessages[0].date)
  //     .limitToLast(limit)
  //   );

  //   this.subs2.sink = this.joinUsers(collection.snapshotChanges()).subscribe(messages => {
  //     let _messages = [];
  //     if (messages.length > 0) {
  //       messages.map(message => {
  //         if (this.allMessages.findIndex(_ => _.id === message.id) === -1) {
  //           _messages.push(message);
  //         }
  //       });
  //     }

  //     this.allMessages = [..._messages, ...this.allMessages]

  //     // console.log('Messages', this.allMessages);
  //     // this.messages = this.messages.sort((a,b) => a.date - b.date);
  //     // setTimeout(() => {
  //     //   this.scrollToBottom(`${startedFromId}`);
  //     // }, 400);
  //     setTimeout(() => {
  //       if (messages.length !== limit) {
  //         this.loadingTopDone = true;
  //       }
  //       this.loadingTop = false;
  //     }, 1000);
  //   });
  // }

  getMessages(roomId) {

    // Old Structure
    // let initial = true;
    // const limit = 10;
    // const fs = this.angularFirestore;
    // const collection = fs.collection('users').doc(this.sender.uid).collection('conversations')
    //   .doc(roomId).collection('messages', ref =>
    //     ref.orderBy('date')
    //       .startAfter((this.chatInfo && this.chatInfo['startAfter']) ? this.chatInfo['startAfter'] : 1606190555)
    //       .limitToLast(limit)
    //   );

    // this.subs2.sink = this.joinUsers(collection.snapshotChanges()).subscribe(messages => {
    //   // this.subs2.sink = collection.valueChanges({idField: 'id'}).subscribe(messages => {
    //   let messageAdded = false;
    //   // console.log('Start Messages', messages);
    //   // if (messages.length < limit) {
    //   //   this.loadMore = false;
    //   // }
    //   if (messages.length > 0) {
    //     messages.map(message => {
    //       if (this.allMessages.findIndex(_ => _.id === message.id) === -1) {
    //         this.allMessages.push(message
    //           // {
    //           //   ...message,
    //           //   align: message.sender !== this.sender.uid ? 'left' : 'right',
    //           // }
    //           );
    //         messageAdded = true;
    //       } else {
    //         // console.log('Else Messages', this.allMessages);
    //       }
    //     })
    //   }
    //   // this.messages = this.messages.sort((a,b) => a.date - b.date);
    //   this.readAs();

    //   // if (initial) {
    //     // setTimeout(() => {
    //       // this.componentRef.directiveRef.scrollToBottom();
    //       // initial = false;
    //       // this.checkTop();
    //     // }, 400);
    //   // } else {
    //     // if(messageAdded && this.messages.slice(-1)[0].sender !== this.sender.uid && !this.chatInfo.archived) {
    //     //   // this.playMusic();
    //     // }
    //   // }
    //   console.log('All Messages', this.allMessages);
    //   // this.loadingMessages = false;
    // });

    //New Structure
    this.loadingMessages = true;
    let startAfter = (this.chatInfo && this.chatInfo.startAfter);

   startAfter = startAfter && startAfter[this.sender.uid] || 1606190555;
   console.log('ChatInfo start', startAfter, 'Room Id', roomId);
   var sAf = startAfter
    let initial = true;
    // const limit = 10;
    const fs = this.angularFirestore;
    const collection = fs.collection('conversations').doc(roomId).collection('messages', ref =>
      ref.orderBy('date')
      .startAfter(sAf)
      // .limitToLast(limit)
    );

    this.subs.sink = collection.valueChanges({idField: 'id'}).subscribe(messages => {
      let messageAdded = false;
      // if(messages.length < limit) {
      //   this.loadMore = false;
      // }

      if(messages.length > 0) {
        this.noMessages = false;
        console.log('b4 Messages', messages);
        messages.map(message => {
          if(this.allMessages.findIndex(_ => _.id === message.id) === -1) {
            this.allMessages.push({
              ...message,
              align: message.senderUID !== this.sender.uid ? 'left' : 'right',
              sender: this.chatInfo.participants[message.senderUID],
              // time: moment.unix(message.date['seconds']).format('MMM D YYYY, h:mm:ss a'),
              // before_time: moment.unix(message.date['seconds']).format('MMM_D_YYYY'),
              time: moment(message['date']).utc(true).format('h:mm a'),
              before_time: moment(message['date']).utc(true).format('MMMM D, YYYY'),
              forwardMsgTime: message['forwardMsg'] ? moment(message['forwardMsg']['date']).utc(true).format('h:mm a') : null,
          });
            messageAdded = true;
          }
        })
      } else {
        this.noMessages = true;
      }
      // this.messages = this.messages.sort((a,b) => a.date - b.date);
      this.readAs();
      console.log('Messages', this.allMessages);
      this.loadingMessages = false;
    });
  }

  // getDate(message){
  //   // return message.date?.toDate ? message.date.toDate() : new Date();
  //   // message.date?.toDate && message.date.toDate()
  //   return moment.unix(message.date['seconds']).format('MMM D YYYY, h:mm:ss a');
  // }

  // getDayMsg(message){
  //   console.log('Msg Time', message.date);
  //   return moment.unix(message.date['seconds']).format('MMM D YYYY, h:mm:ss a');
  // }
  private async readAs() {
    // await this.angularFirestore.firestore.collection('users').doc(this.sender.uid).collection('conversations')
    //   .doc(this.room.roomId).set({
    //     unreads: 0
    //   }, { merge: true });
  }

  // playMusic() {
  //   var audio = new Audio('../../../assets/beep.mp3');
  //   audio.play();
  // }

  //New
  async createGroup() {
    console.log('Group Name', this.groupName, 'groupusers', this.groupSelectedUsers);

    let offsetRef = firebase.database().ref(".info/serverTimeOffset");
    let estimatedServerTimeMs = await offsetRef.once("value");
    let offset = estimatedServerTimeMs.val();
    estimatedServerTimeMs = new Date().getTime() + offset;

    if(!this.groupName){
      return alert('Please add group name');
    }
    const uids = this.groupSelectedUsers.map(item => item.uid);
    const participants = {
        [this.sender.uid]: {
          name: this.userData.name,
          profilePicture: this.userData.profileImage,
          status: this.userData.status,
          hasUnread: false,
          isAdmin: true,
          // unReadMessages: 0,
          unReadMessages: [],
          uid: this.sender.uid,
        }
      };

    this.groupSelectedUsers.forEach(item => {
      participants[item.uid] = {
        name: item.name,
        profilePicture: item.profileImage,
        status: item.status,
        hasUnread: false,
        isAdmin: false,
        // unReadMessages: 0,
        unReadMessages: [],
        uid: item.uid
      }
    })

    const participants_names = this.groupSelectedUsers.map(e => {
        var a = e['name'];
        // var b = e['name'][1];
        // var c = a[0].toUpperCase() + a.substr(1).toLowerCase() + b[0].toUpperCase() + b.substr(1).toLowerCase()
        // console.log('aa', a[0].toUpperCase() + a.substr(1).toLowerCase());
          return a[0].toUpperCase() + a.substr(1).toLowerCase();
        });
    participants_names.push(this.userData.name);

    // const chat: any = await this.checkGroupChatAlreadyExist(this.newReceiver);
    //   if(chat){
    //     console.log('Chat', chat);
    //       // const mainParticipantUid = chat.participants_uid[0] === this.sender.uid ? chat.participants_uid[0] : chat.participants_uid[1];
    //       const mainParticipantUid = chat.participants_uid[0] !== this.sender.uid ? chat.participants_uid[0] : chat.participants_uid[1];
    //       const mainParticipant = chat.participants[mainParticipantUid];

    //       const updatedChat =  ({...chat, mainParticipant: {uid: mainParticipantUid, ...mainParticipant} });
    //       console.log('Updated', updatedChat);
    //       this.conversation = updatedChat;
    //   }
    // if not then can we request one
    await this.angularFirestore.collection('conversations').add({
        uid: this.sender.uid,
        participants_uid: [this.sender.uid, ...uids],
        groupName: this.groupName,
        participants,
        participants_names,
        archived: false,
        archivedBy: [],
        isGroupChat: true,
        files: [],
        // date: new Date(),
        // updatedAt: new Date()
        date: estimatedServerTimeMs,
        updatedAt: estimatedServerTimeMs
    });

    this.groupSelectedUsers = [];
    this.selectedGroupNames = [];
    this.groupName = null;
    this.newChatId = false;
    this.newReceiver = null;
    this.showContacts = false;
    this.toggleEmoji = false;
    this.onNewMsgSent.emit(this.showContacts);
  }

  async checkChatAlreadyExist(user){
    const res = await this.angularFirestore.collection('conversations', ref => {
      return ref.orderBy('participants_uid', 'desc')
        .orderBy('date', 'desc')
        .where('participants_uid', 'array-contains', this.sender.uid)
        .where('isGroupChat', '==', false)
    }).get().toPromise();

    const docs = res.docs.filter(item => item.data().participants_uid.indexOf(user.id) !== -1);

    console.log('docs', docs);
    if(docs.length === 0){
      return false;
    }


    const latestChat = docs[0];
    return {id: latestChat.id, ...latestChat.data()}
  }

  async checkGroupChatAlreadyExist(user){
    const res = await this.angularFirestore.collection('conversations', ref => {
      return ref.orderBy('participants_uid', 'desc')
        .orderBy('date', 'desc')
        .where('participants_uid', 'array-contains', this.sender.uid)
        .where('isGroupChat', '==', true)
    }).get().toPromise();

    const docs = res.docs.filter(item => item.data().participants_uid.indexOf(user.id) !== -1);

    console.log('docs', docs);
    if(docs.length === 0){
      return false;
    }


    const latestChat = docs[0];
    return {id: latestChat.id, ...latestChat.data()}
  }

  async forwardMessage(msg) {
    this.forwardMsg = msg;
    this.forwardMsg['message'] = this.forwardMsg['message'].replace(/^\s+|\s+$/g, '');
    this.forwardMsg['fwdMsgDate'] = moment(this.forwardMsg['date']).utc(true).format('DD/MM/YYYY');
    console.log('Fwd Msg', this.forwardMsg);
  }

  getGrpMemNames(data) {
    if(data.toString().length > 10) {
      return data.toString().slice(0,30) + '...';
    } else {
      return data.toString();
    }

  }
  msgOnEnter(event) {
    // event.preventDefault();
    console.log('Msg', document.getElementById("inline-editor2").innerText.replace(/(\r\n|\n|\r)/gm,""));
    console.log('Msg on enter', this.userData.sendmsgOnEnter);
    if(this.userData.sendmsgOnEnter === true && event.keyCode === 13) {
      this.sendMsg();
    } else {
      return document.getElementById("inline-editor2").innerText.replace(/(\r\n|\n|\r)/gm,"");
    }
  }

  async sendMsg() {
    //Old Structure
    // this.sendingMessage = true;

    // this.typeMessage = document.getElementById("inline-editor2").innerText.replace(/^\s+|\s+$/g, '');
    // console.log('Msg 1', document.getElementById("inline-editor2").innerText.replace(/^\s+|\s+$/g, ''));
    // console.log('Type Msg', this.typeMessage);

    // const files = await this._uploadFile();


    // if ((!this.typeMessage || this.typeMessage.length === 0) && (!files || files.length === 0)) {
    //   this.typeMessage = '';
    //   document.getElementById("inline-editor2").innerText = '';
    //   this.sendingMessage = false;
    //   return;
    // }

    // const senderUID = this.sender.uid;
    // const recieverUID = this.room.roomId;
    // const date = momentTimezone().tz("America/Los_Angeles").unix();

    // const message = {
    //   room: this.room ? this.room.roomId : this.generateUID(),
    //   sender: senderUID,
    //   reciever: recieverUID,
    //   message: this.typeMessage,
    //   // archived: this.chatInfo && this.chatInfo['archived'] ? true : false,
    //   date,
    //   files
    // }

    // console.log('msg', message);

    // if (this.forwardMsg) {
    //   message['forwardMsg'] = this.forwardMsg;
    //   // document.getElementById("inline-editor1").innerText = '';
    // }

    // this.forwardMsg = null;
    // this.typeMessage = '';
    // document.getElementById("inline-editor2").innerText = '';

    // const batch = this.angularFirestore.firestore.batch();

    // if (senderUID !== recieverUID) {
    //   batch.set(this.angularFirestore.firestore.collection('users').doc(senderUID).collection('conversations')
    //     .doc(recieverUID).collection('messages').doc(), message, { merge: true });
    // }
    // batch.set(this.angularFirestore.firestore.collection('users').doc(recieverUID).collection('conversations')
    //   .doc(senderUID).collection('messages').doc(), message, { merge: true });

    // batch.set(this.angularFirestore.firestore.collection('users').doc(senderUID).collection('conversations')
    //   .doc(recieverUID), {
    //   ...message,
    //   unreads: firebase.firestore.FieldValue.increment(1)
    // }, { merge: true });
    // batch.set(this.angularFirestore.firestore.collection('users').doc(recieverUID).collection('conversations')
    //   .doc(senderUID), {
    //   ...message,
    //   unreads: firebase.firestore.FieldValue.increment(1)
    // }, { merge: true });

    // await batch.commit();

    // this.sendingMessage = true;
    // this.newChatId = false;
    // this.showContacts = false;
    // this.toggleEmoji = false;
    // this.onNewMsgSent.emit(this.showContacts);
    // console.log('::msg sent');

    //New Structure
    console.log('COn in sendMsg', this.conversation);
    if(this.conversation) {
      console.log('COn in sendMsg', this.conversation);
      this.angularFirestore.collection('conversations').doc(this.conversation.id).update({ selected: false });
    }
    this.fileLoading = false;
    let offsetRef = firebase.database().ref(".info/serverTimeOffset");
    let estimatedServerTimeMs = await offsetRef.once("value");
    let offset = estimatedServerTimeMs.val();
    estimatedServerTimeMs = new Date().getTime() + offset;

    this.sendingMessage = true;
    this.typeMessage = document.getElementById("inline-editor2").innerText.replace(/^\s+|\s+$/g, '');
    const senderUID = this.sender.uid;
    // const date = firebase.firestore.FieldValue.serverTimestamp();
    // const date = new Date();

    const files = await this._uploadFile();

    if ((!this.typeMessage || this.typeMessage.length === 0) && (!files || files.length === 0)) {
      this.typeMessage = '';
      document.getElementById("inline-editor2").innerText = '';
      this.sendingMessage = false;
      return;
    }

    if (this.newReceiver) {
      console.log('nr', this.newReceiver)
      this.angularFirestore.collection('conversations').add({
        uid: this.sender.uid,
        participants_uid: [this.sender.uid, this.newReceiver.uid],
        participants: {
          [this.sender.uid]: {
              name: this.userData.name,
              profilePicture: this.userData.profileImage,
              status: this.userData.status,
              hasUnread: false,
              // unReadMessages: 0
              unReadMessages: [],
          },
          [this.newReceiver.uid]: {
            name: this.newReceiver.name,
            profilePicture: this.newReceiver.profileImage,
            status: this.newReceiver.status,
            hasUnread: false,
            // unReadMessages: 0
            unReadMessages: [],
          }
        },
        archived: false,
        archivedBy: [],
        isGroupChat: false,
        files: [],
        date: estimatedServerTimeMs,
        updatedAt: estimatedServerTimeMs
    });

      const chat: any = await this.checkChatAlreadyExist(this.newReceiver);
      if(chat){
        console.log('Chat', chat);
          // const mainParticipantUid = chat.participants_uid[0] === this.sender.uid ? chat.participants_uid[0] : chat.participants_uid[1];
          const mainParticipantUid = chat.participants_uid[0] !== this.sender.uid ? chat.participants_uid[0] : chat.participants_uid[1];
          const mainParticipant = chat.participants[mainParticipantUid];

          const updatedChat =  ({...chat, mainParticipant: {uid: mainParticipantUid, ...mainParticipant} });
          console.log('Updated', updatedChat);
          this.conversation = updatedChat;
      }
    }
    const message = {
      createdAt: estimatedServerTimeMs,
      updatedAt: estimatedServerTimeMs,
      seenBy: [],
      conversationID: this.conversation.id,
      // conversationID: this.chatInfo.id,
      senderUID,
      sender: {name: this.sender.name},
      message: this.typeMessage,
      archived: this.chatInfo && this.chatInfo['archived'] ? true : false,
      unReadBy: this.conversation.participants_uid.filter(item => item !== this.sender.uid),
      // date: firebase.firestore.Timestamp.fromDate(date),
      date: estimatedServerTimeMs,
      // date: date2,
      files
    }

    if(this.forwardMsg) {
      message['forwardMsg'] = this.forwardMsg;
    }

    this.forwardMsg = null;
    // this.msg.nativeElement.value = '';
    this.typeMessage='';
    document.getElementById("inline-editor2").innerText = '';


    try {
      await this.angularFirestore.collection('conversations').doc(this.conversation.id).collection('messages').add(message);
      await this.angularFirestore.collection('conversations').doc(this.conversation.id).update({
        'id': this.conversation.id,
        // 'mainParticipant': this.conversation.mainParticipant,
        'lastMessage': message,
        'selected': true,
        // 'date': firebase.firestore.Timestamp.fromDate(date),
        'date': estimatedServerTimeMs
      });

      // if chat was hidden by user
      // unhide chat if hidden by a participant
      this.unHideChatIfHiddenByParticipant(this.conversation);
    } catch (error) {
      console.log(error)
    }


    this.fileLoading = false;
    this.showAttachmentPreview = null;
    this.sendingMessage = true;
    this.groupSelectedUsers = [];
    this.selectedGroupNames = [];
    this.newChatId = false;
    this.newReceiver = null;
    this.showContacts = false;
    this.toggleEmoji = false;
    this.onNewMsgSent.emit(this.showContacts);
    console.log('::msg sent');
  }

  async unHideChatIfHiddenByParticipant(conversation){
    // TODO: wiLL unhide chat when hidden
    // [`hiddenBy.${user.uid}`]: true,

    const hiddenBy = conversation.hiddenBy || {};
    const toBeUpdated = {hiddenBy};

    for(const uid in toBeUpdated.hiddenBy){
      if(conversation.hiddenBy[uid]){
        toBeUpdated.hiddenBy[uid] = false;
      }
    }
    await this.angularFirestore.collection('conversations').doc(this.conversation.id).update({...toBeUpdated});
  }

  fileDetails(event) {
    this.showAttachmentPreview = {
      status: true,
      fileName: event.target.files[0].name,
      fileSize: this.formatBytes(event.target.files[0].size)
    }
  }

  async _uploadFile() {

    const files = (<any>document.getElementById('validatedCustomFile')).files;
    let _files = [];

    for (let index = 0; index < files.length; index++) { const element = files[index]; _files.push(element); }
    if (_files.length === 0) return [];
    this.fileLoading = true;
    _files = await Promise.all(_files.map(async file => {
      const type = file.type; const size = this.formatBytes(file.size); const fileName = file.name; const filePath = this.generateUID() + file.name;
      const task = this.storage.upload(filePath, file);
      file = await task; file = await file.ref.getDownloadURL();
      return { file, size, name: fileName, type }
    }));
    (<any>document.getElementById('validatedCustomFile')).value = '';

    console.log('Files', _files);
    return _files;
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

  private generateUID() {
    let firstPart: any = (Math.random() * 1234546656) | 0;
    let secondPart: any = (Math.random() * 1234546656) | 0;
    firstPart = ("000" + firstPart.toString(36));
    secondPart = ("000" + secondPart.toString(36));
    return firstPart + secondPart;
  }

  async toggleWriting(value) {
    if(this.reciever === null) {
      return document.getElementById("inline-editor2").innerText = '';
    }

    // Old
    // console.log('TG msgs', this.allMessages.length);
    // if (this.allMessages.length < 1) { return }
    this.sendActive = false;
    // console.log('TG Value', value);
    // const doc = this.angularFirestore.firestore.collection('users').doc(this.room.roomId).collection('conversations').doc(this.sender.uid);

    // const batch = this.angularFirestore.firestore.batch();
    // if (value) {
    //   this.sendActive = true;
    //   batch.set(doc, {
    //     writing: true,
    //   }, { merge: true });
    // } else {
    //   this.sendActive = false;
    //   batch.set(doc, {
    //     writing: false,
    //   }, { merge: true });
    // }

    // await batch.commit();
  }

  // async deleteMessage(delmessage) {
  //   console.log('delete msg', delmessage);
  //   await this.angularFirestore.firestore.collection('users').doc(delmessage.sender).collection('conversations')
  //     .doc(delmessage.reciever).collection('messages').doc(delmessage.id).delete();
  //   delmessage.deleted = true;
  // }

  async deleteMessage(delmessage) {
    await this.angularFirestore.firestore
      .collection('conversations')
      .doc(delmessage.conversationID)
      .collection('messages')
      .doc(delmessage.id).delete();
      delmessage.deleted = true;
  }

  async archiveChat(chat = this.chatInfo, user = this.sender) {

    // delete chat.participants[user.uid];
    // delete chat.mainParticipant;
    // delete chat.mainParticipantUid;
    // delete chat.createdAt;

    const data = {archivedBy: null};

    chat.archivedBy = chat.archivedBy || [];
    // chat.archivedBy.indexOf(user.uid) === -1 && chat.archivedBy.push(user.uid);
    data.archivedBy = firebase.firestore.FieldValue.arrayUnion(user.uid);
    console.log('Archived Chat', data.archivedBy);
    await this.angularFirestore.collection('conversations').doc(chat.id).update({...data, updatedAt: new Date() });

    this.showBookMarkStatus = true;
    setTimeout(() => {
      this.showBookMarkStatus = false;
    }, 2500);
    // await this.angularFirestore.collection('conversations').doc(chat.id).set({
    //   archivedBy: data.archivedBy
    // }, { merge: true });
    // await this.angularFirestore.firestore.collection('users').doc(this.sender.uid).collection('conversations').doc(this.chatInfo.id).set({
    //   archived: true
    // }, { merge: true });
    // this.chatInfo.archived = true;
  }

  async unArchiveChat(chat = this.chatInfo, user = this.sender) {
    // delete chat.participants[user.uid];
    // delete chat.mainParticipant;
    // delete chat.mainParticipantUid;
    // delete chat.createdAt;

    chat.archivedBy = chat.archivedBy || [];
    if(chat.archivedBy.indexOf(user.uid) === -1){
      return;
    }

    const data = {archivedBy: null};

    // chat.archivedBy = chat.archivedBy.filter(item => user.uid !== item);
    chat.archivedBy = chat.archivedBy || [];
    data.archivedBy = firebase.firestore.FieldValue.arrayRemove(user.uid);
    await this.angularFirestore.collection('conversations').doc(chat.id).update({...data, updatedAt: new Date()});

    this.showBookMarkStatus = true;
    setTimeout(() => {
      this.showBookMarkStatus = false;
    }, 2500);
    // await this.angularFirestore.firestore.collection('users').doc(this.sender.uid).collection('conversations').doc(this.chatInfo.id).set({
    //   archived: false
    // }, { merge: true });
    // this.chatInfo.archived = false;
  }

  async muteChat() {
    await this.angularFirestore.firestore.collection('users').doc(this.sender.uid).collection('conversations').doc(this.chatInfo.id).set({
      muted: true
    }, { merge: true });
    this.chatInfo.muted = true;
  }

  async unMuteChat() {
    await this.angularFirestore.firestore.collection('users').doc(this.sender.uid).collection('conversations').doc(this.chatInfo.id).set({
      muted: false
    }, { merge: true });
    this.chatInfo.muted = false;
  }

  // async deleteChat() {
  //   const fs = this.angularFirestore;
  //   await fs.firestore.collection('users').doc(this.sender.uid).collection('conversations').doc(this.chatInfo.id).set({
  //     startAfter: momentTimezone().tz("America/Los_Angeles").unix()
  //   });
  //   await fs.collection('users').doc(this.sender.uid).set({
  //     roomId: null,
  //     type: 'user'
  //   }, { merge: true });
  //   this.reciever = null;
  //   this.modalRef.hide();
  // }

  async deleteChat(chat = this.chatInfo, user = this.sender){

    let offsetRef = firebase.database().ref(".info/serverTimeOffset");
    let estimatedServerTimeMs = await offsetRef.once("value");
    let offset = estimatedServerTimeMs.val();
    estimatedServerTimeMs = new Date().getTime() + offset;

    console.log('Chat', chat, 'user', user);
    await this.angularFirestore.collection('conversations').doc(chat.id).update({
      ...chat,
      // updatedAt: new Date(),
      updatedAt: estimatedServerTimeMs,
      // [`startAfter.${user.uid}`]: firebase.firestore.Timestamp.fromDate(new Date())
      [`startAfter.${user.uid}`]: estimatedServerTimeMs,
      [`hiddenBy.${user.uid}`]: true,
    });


    // location.reload();

    // const senderUID = this.sender.uid;
    // const date = estimatedServerTimeMs;
    // const message = {
    //   createdAt: estimatedServerTimeMs,
    //   updatedAt: estimatedServerTimeMs,
    //   seenBy: [],
    //   conversationID: this.conversation.id,
    //   senderUID,
    //   sender: {name: this.sender.name},
    //   message: null,
    //   archived: this.chatInfo && this.chatInfo['archived'] ? true : false,
    //   // date: firebase.firestore.Timestamp.fromDate(date),
    //   date: estimatedServerTimeMs,
    //   files: []
    // }
    // await this.angularFirestore.collection('conversations').doc(this.conversation.id).update({
    //   'lastMessage': message,
    //   // 'date': firebase.firestore.Timestamp.fromDate(date),
    //   'date': estimatedServerTimeMs,
    // });
    // await this.angularFirestore.collection('conversations').doc(this.conversation.id).delete();

    this.reciever = null;
    this.chatInfo = null;
    this.conversation = null;
    this.modalRef.hide();
    // NOTE: reload conversation to see that deleted messages are no longer visible
  }

  onIntersectMessage(message, event){
    if(message.senderUID === this.sender.uid) return;

    console.log('Check Unread', message.unReadBy);
    if(message.unReadBy.findIndex(item => item === this.sender.uid) === -1){
      // TODO: Mark as read by this user if in unread list
      this.angularFirestore.collection('conversationss').doc(message.conversationID).update({
        [`participants.${this.sender.uid}.unReadMessages`]: firebase.firestore.FieldValue.increment(-1)
      })
    }

  }


  joinUsers(chat$: Observable<any>) {
    let chat;
    const joinKeys = {};

    return chat$.pipe(
      switchMap(c => {
        if (c.length) { c = c.map(e => { return { ...e.payload.doc.data(), id: e.payload.doc.id }; }); }

        chat = c;
        const uids = Array.from(new Set(c.map(v => v.sender)));
        const userDocs = uids.filter(e => e).map(u => this.db.object('Users/' + u).valueChanges());
        return userDocs.length ? combineLatest(userDocs) : of([]);
      }),
      map(arr => {
        arr.forEach(v => (joinKeys[(<any>v).uid] = v));
        chat = chat.map(v => {
          return {
            ...v,
            id: v.id,
            // message: v['message'],
            sentBy: joinKeys[v.sender].name,
            // profileImage: (joinKeys[v.sender].profileImage === 'null') ? '' : joinKeys[v.sender].profileImage,
            // time: v['date'] ? moment.unix(v['date']['seconds']).format('h:mm a') : moment.unix(Math.round(new Date().getTime() / 1000)).format('h:mm a'),
            // before_time: v['date'] ? moment.unix(v['date']['seconds']).format('MMMM D YYYY') : moment.unix(Math.round(new Date().getTime() / 1000)).format('MMMM D YYYY'),
            // date: v['date'],
            // time: moment.unix(v['date']).format('h:mm a'),
            // before_time: moment.unix(v['date']).format('MMMM D YYYY'),
            // forwardMsgTime: v['forwardMsg'] ? moment.unix(v['forwardMsg']['date']).format('h:mm a') : null,
            time: moment(v['date']).utc(true).format('HH:mm'),
            before_time: moment(v['date']).utc(true).format('MMMM D, YYYY'),
            forwardMsgTime: v['forwardMsg'] ? moment(v['forwardMsg']['date']).utc(true).format('HH:mm') : null,
            align: joinKeys[v.sender].uid === this.sender.uid ? 'right' : 'left',
            // files: v['files']
          };
        });

        return chat;
      })
    );
  }

  // Emoji
  initEmoji() {
    if(this.reciever === null) {
      return this.toggleEmoji = false;
    }
    console.log('rec', this.reciever, this.newChatId);
    document.addEventListener('click', (event: any) => {
      if (this.toggleEmoji) {
        console.log('wwe', this.toggleEmoji);
        var emojiWrapperInside = document.getElementById('emojiWrapper').contains(event.target);
        var toggleEmojiInside = document.getElementById('toggleEmoji').contains(event.target);

        if (!emojiWrapperInside && !toggleEmojiInside) {
          this.toggleEmoji = false;
        }
      }
    });
  }

  emojiSelect(e) {
    console.log('Emoji Event', e);
    const emoji = e.emoji.native;
    // this.msg.nativeElement.value = (this.msg.nativeElement.value || '') + emoji;
    document.getElementById("inline-editor2").innerText = (document.getElementById("inline-editor2").innerText || '') + emoji;
  }


  toggleEmojiFn() {
    if(this.reciever === null) {
      return this.toggleEmoji = false;
    }
    this.toggleEmoji = !this.toggleEmoji;
  }

  toggleGroupDetails() {
    if(this.grouping) {
      return;
    }
    if(this.closeListOnGroupDets === false ) {
    this.showGroupDetails = true;
    } else {
      this.showGroupDetails = false;
    }
    console.log('shwGrpDet', this.showGroupDetails);
    this.onGroupDetails.emit(this.showGroupDetails);
  }

  toggleNewContact() {
    this.showContacts = false;
    this.onNewContact.emit(this.showContacts)
  }
  ngOnDestroy() {
    this.renderer.removeClass(this.document.body, 'noScroll');
    this.subs2.unsubscribe();
    this.subs.unsubscribe();
  }

}

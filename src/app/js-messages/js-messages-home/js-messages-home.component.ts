import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, Renderer2, OnChanges, ViewChild } from '@angular/core';

import { NotificationsallService } from 'app/providers/notifications.service';
import { ChatService } from 'app/providers/chat.service';
import { takeUntil, debounceTime, distinctUntilChanged, map, switchMap, take } from 'rxjs/operators';
import { ReplaySubject, combineLatest, Observable, of, Subject } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState } from 'app/core/store/app.state';
import { JsProfileService } from 'app/jobseeker/providers/js-profile.service';
import { ShowerrorsService } from 'app/shared/providers/showerrors.service';
import { AngularFireDatabase, AngularFireList } from 'angularfire2/database';
import { AngularFirestore, AngularFirestoreDocument } from 'angularfire2/firestore';
import * as firebase from 'firebase/app';
import { AngularFireStorage } from '@angular/fire/storage';
import 'firebase/database';
import { SubSink } from 'subsink';
import * as moment from 'moment';
import * as momentTimezone from 'moment-timezone';
import { ResponsiveService } from 'app/responsive.service';

@Component({
  selector: 'js-messages-home',
  templateUrl: './js-messages-home.component.html',
  styleUrls: ['./js-messages-home.component.scss']
})
export class JsMessagesHomeComponent implements OnInit, OnDestroy, OnChanges {

  showContacts: Boolean = false;
  isMobile: Boolean = false;
  showMobileChat: Boolean = false;
  showMobileSearchBox: Boolean = false;
  isEditGroupName: Boolean = false;
  showSettings: Boolean = false;
  usersRecentList: Array<Object>;
  loggedUserDetails: any = {};
  userAuthenticated: Boolean;
  typeMessage: string;
  isTyping: Boolean = false;
  private subs = new SubSink();
  private subs2 = new SubSink();
  private subs3 = new SubSink();
  private subs4 = new SubSink();
  private subs5 = new SubSink();
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  newAllList = [];
  public archivedTab = false;
  public userRoute;
  public userData;
  public sendMsgSetting;
  searchText;
  public forwardMsg;
  usersArchiveList: Array<Object>;
  noArchiveChats: Boolean = false;
  archiveLoader: Boolean = false;
  usersUnreadList: Array<Object>;
  noUnreadChats: Boolean = false;
  unReadLoader: Boolean = false;
  public unreadsTab = false;
  loadLimit = 10;
  noArchivedTab: Boolean = false;
  initialLoad: Boolean = false;
  backload: Boolean = false;
  initArchive: Boolean = false;
  conversation: any;
  addContactsToAddGroup: Boolean = false;
  addcontactList = [];
  userAddtionInGroup:Boolean = false;
  userDeletionInGroup:Boolean = false;
  groupName: string;
  messages: any;
  newChatId: Boolean = false;
  groupSelectedUsers = [];
  selectedGroupNames = [];
  newReceiver = null;
  newGroup: Boolean = false;
  closeListOnGroupDets: Boolean = false;
  inGroupList = [];
  grpAdminDetails = [];
  sendmsgOnEnter: Boolean = false;


  constructor(@Inject(DOCUMENT) private document: Document, private renderer: Renderer2, public fsDB: AngularFireDatabase,
    @Inject(PLATFORM_ID) private platformId: Object, public notifications: NotificationsallService,
    private angularFirestore: AngularFirestore, private store: Store<AppState>, public chatService: ChatService,
    private storage: AngularFireStorage, public device: ResponsiveService, private profileser: JsProfileService,
    public snack: ShowerrorsService,
  ) {
    console.log(this.device.findDevice());
    this.isMobile = this.device.findDevice() === 'mobile' ? true : false;

    this.store.select('userState').subscribe(res => {
      this.userAuthenticated = res.authenticated;
      if (this.userAuthenticated !== true) {
        console.log('User state', this.userAuthenticated);
        firebase.database().ref('Users/' + this.loggedUserDetails.uid + '/status').set('offline');
        this.angularFirestore.collection('users').doc(this.loggedUserDetails.uid).set({
          roomId: null,
          type: 'user'
        }, { merge: true });
        // this.angularFirestore.collection('UserDetails').doc(this.loggedUserDetails.uid).update({'status': "away"});
        localStorage.removeItem('fbUser');
        localStorage.removeItem('status');
        localStorage.removeItem('loggedUser');
        localStorage.removeItem('fbUserUid');
      }
    });

    this.searchUsers$.pipe(
      map((e: any) => e.replace(/ /g, '')),
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(value => {
      this.subs.unsubscribe();
      this.subs.sink = this.filterUsers(value, this.loggedUserDetails.uid).valueChanges().subscribe(res => {
        console.log(res);
      })
    });

  }

  composeNewMessage() {
    alert('Hello');
  }

  async getUsers() {
    this.showContacts = true;
    this.subs.sink = this.fsDB.list('Users').snapshotChanges().pipe(
      take(1)
    ).subscribe(gl => {
      this.newAllList = gl.filter(e => e.payload.val()['uid'] !== this.loggedUserDetails.uid).map(e => {
        return {
          id: e.payload.key,
          ...(<any>e.payload).val()
        }
      })
      console.log('NEW ALL', this.newAllList);
    });

    // New
    // const events = await firebase.firestore().collection('UserDetails')
    // events.get().then((querySnapshot) => {
    //     const tempDoc = []
    //     querySnapshot.forEach((doc) => {
    //       if(doc.data()['uid'] !== this.loggedUserDetails.uid) {
    //        tempDoc.push({ id: doc.id, ...doc.data() })
    //       }
    //     })
    //     this.newAllList = tempDoc;
    //     console.log('NEW ALL', this.newAllList);
    //  });

  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.renderer.addClass(this.document.body, 'noScroll');
    }

    this.loggedUserDetails.uid = localStorage.getItem('fbUserUid');
    console.log('Logged Details', this.loggedUserDetails);
    if (this.loggedUserDetails.uid) {

      this.subs3.sink = this.fsDB.object(`Users/${this.loggedUserDetails.uid}`).valueChanges().subscribe(res => {
        this.userData = res;
      });

      this.fsDB.object(`Users/${this.loggedUserDetails.uid}/sendmsgOnEnter`).valueChanges().subscribe(res => {
        this.sendMsgSetting = res ? res : false;
        console.log('sendMsgSetting', this.sendMsgSetting);
      });

      this.subs.sink = this.angularFirestore.collection('users').doc(this.loggedUserDetails.uid).valueChanges().subscribe(res => {
        this.userRoute = res;
      });

      this.chatService.currentAction.subscribe(act => this.userAddtionInGroup = act);
      this.chatService.deleteAction.subscribe(act => this.userDeletionInGroup = act);

      this.getUsers();
      // this.getMutedConversations();
      this.getUnMutedConversations();
      // var newAllList = this.fsDB.list('Users').valueChanges().pipe(map(user => user.filter(d => d['uid'] !== this.loggedUserDetails.uid))).subscribe();
      // console.log('New All', newAllList);

      // console.log('All', this.allUsers$);
      // firebaseChatLogin() {
      // var loggedUser = JSON.parse(localStorage.getItem('loggedUser'));
      // console.log(loggedUser);
      // var password = '123456';
      // firebase.auth().signInWithEmailAndPassword(loggedUser.email, password).then(user => {
      //   console.log('check set data', user);
      //   if(user) {
      //   firebase.database().ref('Users/'+ user.user.uid+'/status').set('online');
      //   console.log('check set data', user.user.uid);
      //   this.loggedUserDetails.uid = user.user.uid;
      //   localStorage.setItem('fbUser', JSON.stringify(user));
      //   this.getRecentUsers();
      //   }
      // },
      // error => {
      //   console.log('No User in Firebase',);
      //   var loggedUser = JSON.parse(localStorage.getItem('loggedUser'));
      //   var password = '123456'
      //       firebase.auth().createUserWithEmailAndPassword(loggedUser.email, password).then((user: any) => {
      //         var user: any = firebase.auth().currentUser;
      //         // Push Data
      //         var ref = firebase.database().ref('Users').child(user.uid)
      //                 var newUserData = {
      //                     uid: user.uid,
      //                     name: loggedUser.name,
      //                     email: user.email,
      //                     status: 'online',
      //                     profileImage: user.photoURL !== null ? user.photoURL : "null"
      //                 };
      //                 console.log('New User Data', newUserData);
      //                 ref.set(newUserData);
      //                 this.loggedUserDetails.uid = user.uid;
      //                 localStorage.setItem('fbUser', JSON.stringify(user));
      //                 this.getRecentUsers();
      //               });
      // });


      this.notifications.userdata.pipe(takeUntil(this.destroyed$)).subscribe(res => {
        if( res && res.userDetailsVo) {
          this.loggedUserDetails.imagePath = res.userDetailsVo.imagePath;
          this.loggedUserDetails.encodedImagePath = res.userDetailsVo.encodedImagePath;
          console.log('Res', this.loggedUserDetails);
          // var imageUrl = this.snack.getJsImage(this.loggedUserDetails.encodedImagePath, 'assets/img/default-user.png');
          // snack.getJsImage(loggedUserDetails.encodedImagePath, 'assets/img/default-user.png')
          var imageUrl = this.notifications.prepareimageforcertification(this.loggedUserDetails.encodedImagePath)
          console.log('imageUrl', imageUrl);
          if (this.loggedUserDetails.imagePath !== null) {
            firebase.database().ref('Users/' + this.loggedUserDetails.uid + '/profileImage').set(imageUrl);
            // this.angularFirestore.collection('UserDetails').doc(this.loggedUserDetails.uid).update({'profileImage': imageUrl});

          } else {
            firebase.database().ref('Users/' + this.loggedUserDetails.uid + '/profileImage').set("null");
            // this.angularFirestore.collection('UserDetails').doc(this.loggedUserDetails.uid).update({'profileImage': "null"});
          }
        }
      });
    }
  }

  getMutedConversations() {
    this.archivedTab = true;
    this.showContacts = false;
    this.archiveLoader = true;
    // this.noArchiveChats = false;
    // this.getRecentUsers(false, true);
    this.subs2.unsubscribe();
    // const collectionRef = this.angularFirestore.collection('users').doc(this.loggedUserDetails.uid);

    const collectionRef = this.angularFirestore.collection('conversations', ref => {
      return ref.orderBy('date', 'desc')
        .where('archivedBy', 'array-contains', this.loggedUserDetails.uid)
      // .where('participants_uid', 'array-contains', this.loggedUserDetails.uid);
    });

    // this.subs2.sink = this.joinUsers(_collection.snapshotChanges()).subscribe(usersArchiveList => {
    this.subs2.sink = collectionRef.valueChanges({ idField: 'id' }).subscribe(usersArchiveList => {
      // this.usersArchiveList = usersArchiveList;
      // console.log('Recent Archive List', this.usersArchiveList);
      // if(this.usersArchiveList.length === 0) {
      //   console.log('No  Archive Chats');
      //   this.noArchiveChats = true;
      // } else {
      //   this.noArchiveChats = false;
      // }

      //New
      this.usersArchiveList = usersArchiveList.map((item: any) => {

        const mainParticipantUid = item.participants_uid[0] !== this.loggedUserDetails.uid ? item.participants_uid[0] : item.participants_uid[1];
        let mainParticipant = item.participants[mainParticipantUid];

        if (item.isGroupChat) {
          mainParticipant = {
            name: item.groupName,
            profilePicture: "null"
          }
        } else {
          mainParticipant = { uid: mainParticipantUid, ...mainParticipant };
        }

        return ({ ...item, mainParticipant });
      });
      console.log('Recent Archive List', this.usersArchiveList);
      this.archiveLoader = false;
      console.log('Recent User List', this.usersArchiveList);
      if (this.usersArchiveList && this.usersArchiveList.length === 0) {
        console.log('No  Archive Chats');
        this.noArchiveChats = true;
      } else {
        this.noArchiveChats = false;
      }
    });
  }

  getUnreadConversations() {
    this.unreadsTab = true;
    this.showContacts = false;
    this.unReadLoader = true;

    this.subs2.unsubscribe();
    const collectionRef = this.angularFirestore.collection('users').doc(this.loggedUserDetails.uid);
    let _collection;

    _collection = collectionRef.collection('conversations', ref => {
      return ref.orderBy('unreads', 'desc').where('unreads', '!=', 0).orderBy('date', 'desc')
    });

    // this.subs2.sink = this.joinUsers(_collection.snapshotChanges()).subscribe(usersUnreadList => {
      this.subs2.sink = _collection.valueChanges({ idField: 'id' }).subscribe(usersUnreadList => {
      this.usersUnreadList = usersUnreadList;
      this.unReadLoader = false;
      console.log('Unreads List', this.usersUnreadList);
      if (this.usersUnreadList && this.usersUnreadList.length === 0) {
        console.log('No Unread Chats');
        this.noUnreadChats = true;
      } else {
        this.noUnreadChats = false;
      }
    });
  }

  getUnMutedConversations() {
    this.archivedTab = false;
    this.showContacts = false;
    this.unreadsTab = false;
    this.getRecentUsers();
  }

  getRecentUsers() {
    this.noArchivedTab = false;
    this.initialLoad = true;
    // console.log('next', next);
    // this.subs2.unsubscribe();
    // // this.usersRecentList = [];
    // console.log('uid', this.loggedUserDetails.uid);
    // const collectionRef = this.angularFirestore.collection('users').doc(this.loggedUserDetails.uid);
    // let _collection;

    // // if (!next) {
    //   _collection = collectionRef.collection('conversations', ref => {
    //     return ref.orderBy('date', 'desc')
    //   });
    // // } else {
    // //   _collection = collectionRef.collection('conversations', ref => {
    // //     return ref.orderBy('date', 'desc').where('archived', '==', archived)
    // //   });
    // // }

    // this.subs2.sink = this.joinUsers(_collection.snapshotChanges()).subscribe(usersRecentList => {
    //   this.usersRecentList = usersRecentList;
    //   console.log('Recent User List', this.usersRecentList);
    //   if(this.usersRecentList.length === 0) {
    //     console.log('No Chats');
    //     this.showContacts = true;
    //   }
    // });

    // New Structure
    this.subs2.unsubscribe();
    const collectionRef = this.angularFirestore.collection('conversations', ref => {
      // if(!next) {
      return ref.orderBy('date', 'desc')
        // .where('archived', '==', false)
        .where('participants_uid', 'array-contains', this.loggedUserDetails.uid);
      // } else {
      //   return ref.orderBy('date', 'desc')
      //     .where('archived', '==', archived)
      //     .where('participants_uid', 'array-contains', this.userDetails.uid);
      // }

    });

    this.subs2.sink = collectionRef.valueChanges({ idField: 'id' }).subscribe(usersList => {
      console.log('Users List', usersList);
      this.usersRecentList = usersList.map((item: any) => {

        // const mainParticipantUid = item.participants_uid[0] !== this.loggedUserDetails.uid ? item.participants_uid[0] : item.participants_uid[1];
        // const mainParticipant = item.participants[mainParticipantUid];

        // return ({...item, mainParticipant: {uid: mainParticipantUid, ...mainParticipant} });

        const mainParticipantUid = item.participants_uid[0] !== this.loggedUserDetails.uid ? item.participants_uid[0] : item.participants_uid[1];
        let mainParticipant = item.participants[mainParticipantUid];


        if (item.isGroupChat) {
          mainParticipant = {
            name: item.groupName,
            profilePicture: "null"
          }
        } else {
          mainParticipant = { uid: mainParticipantUid, ...mainParticipant };
        }

        return ({ ...item, mainParticipant });
      }).filter( item => {

        // TODO: Filter out where the chat is hidden or deleted
        if(item.hiddenBy && item.hiddenBy[this.loggedUserDetails.uid]){
          return false;
        }
        return item;
      });

      console.log('Recent Users List', this.usersRecentList);

      if(this.usersRecentList && this.usersRecentList.length === 0) {
        console.log('No Chats');
        this.showContacts = true;
      }
      if(this.initialLoad === true && !this.backload && (this.usersRecentList &&  this.usersRecentList.length !== 0) ) {
        console.log('Latest User', this.usersRecentList[0]);
        this.showChat(this.usersRecentList[0]);
        this.initialLoad = false;
      }
      this.backload = false;
    });
  }

  getusersTab() {
    console.log('UsersTab');
    if (this.usersRecentList.length === 0) {
      return this.showContacts = true;
    }
    this.showContacts = false;
    this.newChatId = false;
    this.searchText = '';
    this.newReceiver = null;
    this.groupSelectedUsers = [];
    // this.conversation = null;
    // this.angularFirestore.collection('users').doc(this.loggedUserDetails.uid).set({
    //   roomId: null,
    //   type: 'user'
    // }, { merge: true });
    this.getUnMutedConversations();
  }

  joinUsers(chat$: Observable<any>) {
    let chat;
    const joinKeys = {};

    return chat$.pipe(
      switchMap(c => {

        if (c.length) {
          c = c.map(e => {
            return { ...e.payload.doc.data(), id: e.payload.doc.id };
          });
        }

        // Unique User IDs
        chat = c;
        const uids = Array.from(new Set(c.map(v => v.id)));

        // Firestore User Doc Reads
        const userDocs = uids.filter(e => e).map(u => this.fsDB.object('Users/' + u).valueChanges());

        return userDocs.length ? combineLatest(userDocs) : of([]);
      }),
      map(arr => {
        // arr.forEach(v => (joinKeys[(<any>v).uid] = v));
        // chat = chat.map(v => {
        arr.filter((e) => (e != null)).forEach(v => (joinKeys[(<any>v).uid] = v));
        chat = chat.filter((v) => (joinKeys[v.id])).map(v => {
          return {
            ...v,
            name: joinKeys[v.id].name,
            profilePicture: (joinKeys[v.id].profileImage === 'null') ? '' : joinKeys[v.id].profileImage,
            status: joinKeys[v.id].status,
            unRead: v['unreads'],
            // time: moment(v['date']).fromNow(),
            time: moment(v['date']).utc(true).format('MMM D, YYYY'),
          };
        });

        return chat;
      })
    );
  }

  //New
  async checkChatAlreadyExist(user) {
    const res = await this.angularFirestore.collection('conversations', ref => {
      return ref.orderBy('participants_uid', 'desc')
        .orderBy('date', 'desc')
        .where('participants_uid', 'array-contains', this.loggedUserDetails.uid)
        .where('isGroupChat', '==', false)
    }).get().toPromise();

    const docs = res.docs.filter(item => item.data().participants_uid.indexOf(user.id) !== -1);

    if (docs.length === 0) {
      return false;
    }


    const latestChat = docs[0];
    console.log('User', user, 'latest', latestChat.data());

    return { id: latestChat.id, ...latestChat.data() }
  }

  //New
  // async createSingleChat(user) {

  //   // not the correct user details
  //   if (!user.id) {
  //     return;
  //   }

  //   // check that we dont already have a chat with this user
  //   const chat: any = await this.checkChatAlreadyExist(user);
  //   if (chat) {
  //     console.log('Chat', chat);
  //     //  const mainParticipantUid = chat.participants_uid[0] === this.loggedUserDetails.uid ? chat.participants_uid[0] : chat.participants_uid[1];
  //     const mainParticipantUid = chat.participants_uid[0] !== this.loggedUserDetails.uid ? chat.participants_uid[0] : chat.participants_uid[1];
  //     const mainParticipant = chat.participants[mainParticipantUid];

  //     const updatedChat = ({ ...chat, mainParticipant: { uid: mainParticipantUid, ...mainParticipant } });
  //     console.log('Updated', updatedChat);
  //     return this.showChat(updatedChat);
  //   }

  //   console.log(this.userData)
  //   // if not then can we request one
  //   await this.angularFirestore.collection('conversations').add({
  //     uid: this.loggedUserDetails.uid,
  //     participants_uid: [this.loggedUserDetails.uid, user.id],
  //     participants: {
  //       [this.loggedUserDetails.uid]: {
  //         name: this.userData.name,
  //         profilePicture: this.userData.profileImage,
  //         status: this.userData.status,
  //         hasUnread: false,
  //         // unReadMessages: 0
  //         unReadMessages: [],
  //       },
  //       [user.id]: {
  //         name: user.name,
  //         profilePicture: user.profileImage,
  //         status: user.status,
  //         hasUnread: false,
  //         // unReadMessages: 0
  //         unReadMessages: [],
  //       }
  //     },
  //     archived: false,
  //     archivedBy: [],
  //     isGroupChat: false,
  //     files: [],
  //     date: new Date(),
  //     updatedAt: new Date()
  //   });

  //   this.newChatId = true;
  // }

  getRecentUserTime(recentUser) {
    if (recentUser.lastMessage) {
      // return moment.unix(recentUser.lastMessage.date).format('MMM D');
      return moment(recentUser.lastMessage['date']).utc(true).format('MMM D, YY');
    } else {
      console.log('No Last message');
      // return moment.unix(recentUser.date).format('MMM D');
      return moment(recentUser['date']).utc(true).format('MMM D, YY');
    }
  }

  getLastMessage(data) {
    if(data && data.message.length !== 0) {
      return data.message;
    } else if(data && data.message.length === 0 && data.files.length !== 0) {
      return 'file';
    } else {
      return '';
    }
  }

  async showChat(user) {
    //Old Structure
    // this.messages = [];
    // console.log('user', user);
    // this.initArchive = false;
    // const uid = user.id;
    // const fs = this.angularFirestore;
    // await fs.collection('users').doc(this.loggedUserDetails.uid).set({
    //   roomId: uid,
    //   type: 'user'
    // }, { merge: true });

    // this.showMobileChat = true;

    // New Struture
    if(this.conversation) {
      this.angularFirestore.collection('conversations').doc(this.conversation.id).update({ selected: false });
    }
    console.log('Before Con in jshome', this.conversation);
    this.conversation = user;
    this.angularFirestore.collection('conversations').doc(this.conversation.id).update({ selected: true });
    console.log('Con in jshome', this.conversation);
  }

  groupMembers: any;
  ngOnChanges() {
    console.log('Only one selected', this.groupMembers);
  }

  add(user) {

    let i = this.groupSelectedUsers.findIndex(item => item.uid === user.uid);

    if (i === -1) {
      this.groupSelectedUsers.push(user);
    }
  }

  checkUserIsAdmin(user, chat) {
    console.log('check admin', user, chat);
    // const i = chat.participants.findIndex((item, key) => item.isAdmin === true && user.uid === key);
    // return i !== -1;
    return chat.participants[user.uid].isAdmin === true;

  }

  openContactsToAdd(chat) {
    this.addContactsToAddGroup = true;
    this.closeListOnGroupDets = false;
    this.getAddContactsGroup(chat);
    console.log('add contac', this.addContactsToAddGroup, this.closeListOnGroupDets);
  }

  getAddContactsGroup(chat) {
    var arr = chat.participants_uid;
    console.log('arr', chat.participants_uid);
    this.subs.sink = this.fsDB.list('Users').snapshotChanges().pipe(
      take(1)
    ).subscribe(gl => {
      this.addcontactList = gl.filter(e => !arr.includes(e.payload.val()['uid']) ).map(e => {
        return {
          id: e.payload.key,
          ...(<any>e.payload).val()
        }
      })
      console.log('addcontactList', this.addcontactList);
    });
  }


  // add this user to the chat and make this chat a group chat
  async addUser(user, chat = this.conversation) {
    if (!this.checkUserIsAdmin(this.userData, chat)) {
      return;
    }
    delete chat.createdAt;

    if (chat.participants_uid.indexOf(user.uid) !== -1) {
      alert('User already in Group');
      return;
    }
    chat.participants_uid.push(user.uid);
    chat.participants_names.push(user.name);
    chat.participants[user.uid] = {
      name: user.name,
      profilePicture: user.profileImage,
      status: user.status,
      hasUnread: false,
      isAdmin: false,
      uid: user.uid,
      // unReadMessages: 0
      unReadMessages: [],
    }
    console.log('Chat Names', chat.participants_names);
    await this.angularFirestore.collection('conversations').doc(chat.id).update({ ...chat, updatedAt: new Date() });

    this.inGroupList = Object.values(this.conversation.participants);
    let index = this.inGroupList.findIndex(tt => tt.isAdmin == true);
      if(index !== 0) {
      console.log('admin index', index, this.inGroupList[index], this.inGroupList[0]);
      var b = this.inGroupList[0];
      this.inGroupList[0] = this.inGroupList[index];
      this.inGroupList[index] = b;
      console.log('GroupLis in addUser', this.inGroupList);
    }
    this.userAddtionInGroup = true;
    this.chatService.changeActionOnUser(this.userAddtionInGroup);
    this.closeListOnGroupDets = true;
    this.addContactsToAddGroup = false;
    this.searchText = '';
    // alert(user.name+' is added to '+ chat.mainParticipant['name']);
  }

  // remove this user from this chat
  async removeUser(user, chat = this.conversation) {
    console.log('User', user, 'Chat', chat);
    if (!this.checkUserIsAdmin(this.userData, chat)) {
      return;
    }
    delete chat.createdAt;
    delete chat.startAfter;

    if (chat.participants_uid.indexOf(user.uid) === -1) {
      return;
    }
    // delete chat.participants_uid[user.uid];
    chat.participants_uid = chat.participants_uid.filter(item => item !== user.uid);
    delete chat.participants[user.uid];
    chat.participants_names = chat.participants_names.filter(item => item.toLowerCase() !== user.name.toLowerCase());
    // delete chat.participants_names[user.name];
    console.log('After Removed Chat Names', chat);
    await this.angularFirestore.collection('conversations').doc(chat.id).update({ ...chat, updatedAt: new Date() });

    // Emit an event to conversations to update the chat, we
    this.conversation.participants = chat.participants;
    this.inGroupList = Object.values(this.conversation.participants);

    let index = this.inGroupList.findIndex(tt => tt.isAdmin == true);
      if(index !== 0) {
      console.log('admin index', index, this.inGroupList[index], this.inGroupList[0]);
      var b = this.inGroupList[0];
      this.inGroupList[0] = this.inGroupList[index];
      this.inGroupList[index] = b;
      console.log('GroupLis in removeUser', this.inGroupList);
    }
    this.userDeletionInGroup = true;
    this.chatService.deleteActionOnUser(this.userDeletionInGroup);
    console.log('qwesdxcvfd2', this.userDeletionInGroup);
    // alert(user.name+' is removed from '+chat.mainParticipant['name']);
  }

  async changeGroupName(chat) {
    this.groupName = document.getElementById("grpname").innerText.replace(/^\s+|\s+$/g, '')
    chat.groupName = this.groupName;
    chat.mainParticipant['name'] = this.groupName;
    await this.angularFirestore.collection('conversations').doc(chat.id).update({ ...chat, updatedAt: new Date() });
    this.isEditGroupName = false;
  }

  async closeGroupName(chat) {
    document.getElementById("grpname").innerText = chat.groupName;
    this.isEditGroupName = false;
  }

  async showNewChat(user) {

    let i = this.groupSelectedUsers.findIndex(item => item.uid === user.uid);
    if (i === -1) {
      this.groupSelectedUsers.push(user);
      if (this.groupSelectedUsers.length === 1) {
        console.log('Only one selected', this.groupSelectedUsers);
        const uid = this.groupSelectedUsers[0].uid;
        const fs = this.angularFirestore;
        const chat: any = await this.checkChatAlreadyExist(this.groupSelectedUsers[0]);
        if (chat) {
          console.log('Chat', chat);
          const mainParticipantUid = chat.participants_uid[0] !== this.loggedUserDetails.uid ? chat.participants_uid[0] : chat.participants_uid[1];
          const mainParticipant = chat.participants[mainParticipantUid];

          const updatedChat = ({ ...chat, mainParticipant: { uid: mainParticipantUid, ...mainParticipant } });
          console.log('Updated', updatedChat);
          return this.showChat(updatedChat);
        } else {
          console.log('No Chat');
          this.conversation = null;
          this.newReceiver = this.groupSelectedUsers[0];
        }
        this.newChatId = true;
      } else {
        this.conversation = null;
        this.newGroup = true;
        console.log('More than one selected', this.groupSelectedUsers);
      }
    } else {
      console.log('Already in list');
    }

    //Old Structure
    // const uid = user.uid;
    // const fs = this.angularFirestore;
    // await fs.collection('users').doc(this.loggedUserDetails.uid).set({
    //   roomId: uid,
    //   type: 'user'
    // }, { merge: true })
    // this.newChatId = true;
  }

  newMsgSentEvent(data) {
    this.newChatId = false;
    this.showContacts = false;
    this.groupSelectedUsers = [];
    this.selectedGroupNames = [];
    this.searchText = '';
    // this.createSingleChat(this.groupSelectedUsers[0]);
  }

  newContact(data) {
    console.log('dat', data);
    this.showContacts = true;
  }

  groupDetailsEvent(data) {
    this.closeListOnGroupDets = data;
    if (this.closeListOnGroupDets === true) {
      for (let i in this.conversation.participants) {
        console.log('Each', this.conversation.participants[i]);
        if (this.conversation.participants[i]['isAdmin'] === true) {
          this.grpAdminDetails.push(this.conversation.participants[i]);
        }
      }
      // this.newAdmin = [];
      this.inGroupList = Object.values(this.conversation.participants);
      // let data = this.inGroupList.filter(tt => tt.isAdmin == true);
      // this.newAdmin = data;
      let index = this.inGroupList.findIndex(tt => tt.isAdmin == true);
      // this.inGroupList.splice(index, 1);
      if(index !== 0) {
      console.log('admin index', index, this.inGroupList[index], this.inGroupList[0]);
      var b = this.inGroupList[0];
      this.inGroupList[0] = this.inGroupList[index];
      this.inGroupList[index] = b;
      console.log('GroupLis', this.inGroupList);
    }
      // this.inGroupList.forEach(element => {
      //   let file = {...element}
      //   this.newAdmin.push(file);
      // })
      // return this.conversation.participants[user.uid].isAdmin === true;

    }
    console.log('grpAdminDetails', this.grpAdminDetails);
  }

  toggleListOnGD() {
    this.closeListOnGroupDets = false;
  }
  toggleToGD() {
    this.closeListOnGroupDets = true;
    this.addContactsToAddGroup = false;
  }
  demo(data) {
    console.log(data);
  }

  msgOnEnter() {
    this.sendMsgSetting = !this.sendMsgSetting;
    firebase.database().ref('Users/' + this.loggedUserDetails.uid + '/sendmsgOnEnter').set(this.sendMsgSetting);
    console.log('Send Msg on Enter', this.sendMsgSetting);
  }

  searchUsers$ = new Subject();
  searchUsers(e) {
    this.searchUsers$.next(e.target.value);
  }

  filterUsers(searchText, uid = '', loadLimit = 10) {
    return this.angularFirestore
      .collection('chat',
        ref => ref
          .where('type', '==', 'single')
          .where('userNames', 'array-contains', searchText)
          .orderBy('updatedAt', 'desc')
          .limit(loadLimit)
      );
  }

  ngOnDestroy(): void {
    this.renderer.removeClass(this.document.body, 'noScroll');
    this.destroyed$.next(true);
    this.destroyed$.complete();
    this.subs.unsubscribe();
  }

}

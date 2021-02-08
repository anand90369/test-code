import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFireDatabase } from '@angular/fire/database';
import * as firebase from 'firebase/app';
import { AngularFirestore } from 'angularfire2/firestore';
import { tap, map, switchMap, first } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { AppState } from 'app/core/store/app.state';
import { HttpClient } from '@angular/common/http';
import { Config } from 'protractor';
import { environment } from 'environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatService {
    userID: string;

    public user$ = new Subject();
    public users = {};
    public selectedChat$ = new Subject();
    public selectedGroup$ = new Subject();

    private userActionInGroup = new BehaviorSubject<Boolean>(false);
    private userDeleteInGroup = new BehaviorSubject<Boolean>(false);
    currentAction = this.userActionInGroup.asObservable();
    deleteAction = this.userDeleteInGroup.asObservable();

    constructor(
      private afAuth: AngularFireAuth, private db: AngularFireDatabase,
      private angularFirestore: AngularFirestore,
      private store: Store<AppState>,
      private http: HttpClient
      ) {
//       console.log('presence');
      // this.store.select('userState').subscribe(res => {
      //   if(res.authenticated === true) {
      //     console.log('Away');
          this.updateOnAway();
      //   }
      // });
          this.updateOnUser();
          this.updateOnDisconnect().subscribe();


    }


    getBasicUserDatails(emailId) {
      return this.http.post<Config>(`${environment.JS_API}/jobseeker/profilesummary/basicDetails`, { emailIds: [emailId]});
    }



    // private messageSource = new BehaviorSubject<string>('uid');
    // currentMessage = this.messageSource.asObservable();

    // changeMessage(message: string) {
    //     console.log('us msg', message);
    //     this.messageSource.next(message);
    //   }



    changeActionOnUser(action: Boolean) {
        console.log('us action', action);
        this.userActionInGroup.next(action);
      }

    deleteActionOnUser(action: Boolean) {
        console.log('us action', action);
        this.userDeleteInGroup.next(action);
    }

    getUser(uid) {
      return this.db.object('Users/' + uid).valueChanges();
    }

    getUserName(uid) {
      this.db.object('Users/'+uid+'/name').valueChanges();
    }

    getPresence(uid: string) {
        this.db.object(`Users/${uid}/status`).valueChanges().subscribe( data => {
        return data;
      });
    }

    getUserDet() {
      return this.afAuth.authState.pipe(first()).toPromise();
    }


    async setPresence(status: string) {
      const user = await this.getUserDet();
      if (user) {
        // return this.db.object(`Users/${user.uid}/status`).update(status);
        return firebase.database().ref(`Users/${user.uid}/status`).set(status);
        // return this.angularFirestore.collection('UserDetails').doc(user.uid).update({'status': status});
      }
    }

    // get timestamp() {
    //   return firebase.database.ServerValue.TIMESTAMP;
    // }

    async updateOnUser() {
      const user = await this.getUserDet();
      var logUid = localStorage.getItem('fbUserUid');
      if(user.uid === logUid) {

        const connection = this.db.object('.info/connected').valueChanges().pipe(
          map(connected => connected ? 'online' : 'offline')
        );

        return this.afAuth.authState.pipe(
          switchMap(user =>  user ? connection : of('offline')),
          tap(status => this.setPresence(status))
        );
      }
    }


    // // User navigates to a new tab, case 3
    updateOnAway() {
      document.onvisibilitychange = (e) => {
        this.store.select('userState').subscribe(res => {
          if(res.authenticated === true) {
            if (document.visibilityState === 'hidden') {
              this.setPresence('away');
            } else {
              this.setPresence('online');
            }
          } else {
            this.setPresence('offline');
          }
        });
      };
    }

    async signOut() {
      await this.setPresence('offline');
      await this.afAuth.auth.signOut();
    }

    // // User closes the app, case 2 and 5
    updateOnDisconnect() {
      return this.afAuth.authState.pipe(
        tap(user => {
          if (user) {
              console.log('Discone User', user.uid);
            firebase.database().ref(`Users/${user.uid}/status`).onDisconnect
            ().set('offline');
            // this.angularFirestore.collection('UserDetails').doc(user.uid).update({'status': 'offline'})
          }
        })
      );

    }
}

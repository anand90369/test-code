import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Subject } from 'rxjs/internal/Subject';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ResponsiveService {

  private isMobile = new Subject();
  public screenWidth: string;
  public devicePlatform: string;
  user_Agent;

  constructor(@Inject(PLATFORM_ID) public platformid) {
    this.checkWidth();
  }

  onMobileChange(status: boolean) {
    this.isMobile.next(status);
  }

  getMobileStatus(): Observable<any> {
    return this.isMobile.asObservable();
  }

  public findDevice () {
    this.user_Agent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(window.navigator.userAgent);
    if (this.user_Agent) {
      let isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(navigator.userAgent.toLowerCase());
      if (isTablet) {
        return 'tablet';
      } else {
        return 'mobile';
      }
    } else {
      return 'desktop';
    }
  }

  public checkWidth() {
    if (isPlatformBrowser(this.platformid)) {
      let width = window.innerWidth;
      if (width <= 768) {
        this.screenWidth = 'sm';
        this.onMobileChange(true);
      } else if (width > 768 && width <= 992) {
        this.screenWidth = 'md';
        this.onMobileChange(false);
      } else if(width > 992 && width <= 1024) {
        this.screenWidth = 'tab_landscape';
        this.onMobileChange(false);
      } else {
        this.screenWidth = 'lg';
        this.onMobileChange(false);
      }
    }
  }

}

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { JsMessagesHomeComponent } from './js-messages-home.component';

describe('JsMessagesHomeComponent', () => {
  let component: JsMessagesHomeComponent;
  let fixture: ComponentFixture<JsMessagesHomeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ JsMessagesHomeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(JsMessagesHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

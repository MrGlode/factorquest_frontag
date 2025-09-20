import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mines } from './mines';

describe('Mines', () => {
  let component: Mines;
  let fixture: ComponentFixture<Mines>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Mines]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Mines);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

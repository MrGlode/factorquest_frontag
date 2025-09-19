import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineShop } from './machine-shop';

describe('MachineShop', () => {
  let component: MachineShop;
  let fixture: ComponentFixture<MachineShop>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MachineShop]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MachineShop);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

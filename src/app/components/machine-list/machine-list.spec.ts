import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineList } from './machine-list';

describe('MachineList', () => {
  let component: MachineList;
  let fixture: ComponentFixture<MachineList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MachineList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MachineList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Assemblers } from './assemblers';

describe('Assemblers', () => {
  let component: Assemblers;
  let fixture: ComponentFixture<Assemblers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Assemblers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Assemblers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

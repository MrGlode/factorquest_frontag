import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Furnaces } from './furnaces';

describe('Furnaces', () => {
  let component: Furnaces;
  let fixture: ComponentFixture<Furnaces>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Furnaces]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Furnaces);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

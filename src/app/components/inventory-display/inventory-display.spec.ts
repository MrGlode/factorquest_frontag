import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryDisplay } from './inventory-display';

describe('InventoryDisplay', () => {
  let component: InventoryDisplay;
  let fixture: ComponentFixture<InventoryDisplay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryDisplay]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryDisplay);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

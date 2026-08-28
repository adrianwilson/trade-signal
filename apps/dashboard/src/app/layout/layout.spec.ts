import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { LayoutComponent } from './layout';

describe('LayoutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutComponent, RouterModule.forRoot([])],
    }).compileComponents();
  });

  it('should create the layout', () => {
    const fixture = TestBed.createComponent(LayoutComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the toolbar and sidenav', () => {
    const fixture = TestBed.createComponent(LayoutComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-toolbar')).toBeTruthy();
    expect(compiled.querySelector('mat-sidenav')).toBeTruthy();
  });
});

import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Floating, transparent navbar that gradually becomes more solid as the
 * page scrolls (see brief: "Become slightly solid while scrolling").
 * Collapses to a slide-down mobile menu below the tablet breakpoint.
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  /** True once the user has scrolled past the threshold — solidifies the bar. */
  readonly isScrolled = signal(false);
  /** Mobile menu open/closed state. */
  readonly isMenuOpen = signal(false);

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled.set(window.scrollY > 24);
  }

  toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }
}

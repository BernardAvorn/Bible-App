import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BibleService } from '../../core/services/bible.service';
import { AsyncState, initialAsyncState, RandomVerseResult } from '../../core/models/bible.models';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';

/**
 * Home / landing page: full-screen hero with a random verse pulled fresh
 * on every visit, plus a CTA into the full reading experience.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, LoadingSkeletonComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private readonly bibleService = inject(BibleService);

  readonly verseState = signal<AsyncState<RandomVerseResult>>(initialAsyncState());

  ngOnInit(): void {
    this.loadRandomVerse();
  }

  loadRandomVerse(): void {
    this.verseState.set({ loading: true, error: null, data: null });

    this.bibleService.getRandomVerse().subscribe({
      next: (result) => this.verseState.set({ loading: false, error: null, data: result }),
      error: () =>
        this.verseState.set({
          loading: false,
          error: "Couldn't reach the Bible API right now. Please try again in a moment.",
          data: null,
        }),
    });
  }
}

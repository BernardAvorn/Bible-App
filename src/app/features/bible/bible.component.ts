import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { BibleService } from '../../core/services/bible.service';
import {
  AsyncState,
  BibleBook,
  BibleChapter,
  BibleTranslation,
  BibleVerse,
  initialAsyncState,
} from '../../core/models/bible.models';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';

type ViewMode = 'books' | 'chapters' | 'verses';

/**
 * The full reading experience: translation switching, book/chapter
 * browsing, and reference search (single verse, verse range, or whole
 * chapter) with live autocomplete over book names.
 *
 * Note on "keyword" search from the brief: bible-api.com has no full-text
 * search endpoint, so search here resolves references ("John 3:16", a
 * range like "John 3:16-18", or just "John 3") rather than arbitrary
 * keywords. Typing a book name alone jumps straight to that book.
 */
@Component({
  selector: 'app-bible',
  standalone: true,
  imports: [LoadingSkeletonComponent],
  templateUrl: './bible.component.html',
  styleUrl: './bible.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BibleComponent implements OnInit {
  private readonly bibleService = inject(BibleService);

  // ---- Translation ----
  readonly translationsState = signal<AsyncState<BibleTranslation[]>>(initialAsyncState());
  readonly selectedTranslation = signal<string>(this.bibleService.defaultTranslation);

  // ---- Browse state ----
  readonly viewMode = signal<ViewMode>('books');
  readonly booksState = signal<AsyncState<BibleBook[]>>(initialAsyncState());
  readonly selectedBook = signal<BibleBook | null>(null);
  readonly chaptersState = signal<AsyncState<BibleChapter[]>>(initialAsyncState());
  readonly selectedChapter = signal<number | null>(null);
  readonly versesState = signal<AsyncState<BibleVerse[]>>(initialAsyncState());
  /** Set when the current verse view came from a ranged reference search (e.g. John 3:16-18) rather than a full chapter browse. */
  readonly verseRangeLabel = signal<string | null>(null);

  // ---- Search / autocomplete ----
  readonly searchQuery = signal('');
  readonly showSuggestions = signal(false);
  readonly activeSuggestionIndex = signal(-1);
  readonly searchError = signal<string | null>(null);

  readonly bookSuggestions = computed<BibleBook[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const books = this.booksState().data ?? [];
    if (!query) return [];
    // Don't suggest books once the query already looks like a full reference (has a number).
    if (/\d/.test(query)) return [];
    return books.filter((b) => b.name.toLowerCase().includes(query)).slice(0, 8);
  });

  ngOnInit(): void {
    this.loadTranslations();
    this.loadBooks(this.selectedTranslation());
  }

  // ---------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------

  private loadTranslations(): void {
    this.translationsState.set({ loading: true, error: null, data: null });
    this.bibleService.getTranslations().subscribe({
      next: (data) => this.translationsState.set({ loading: false, error: null, data }),
      error: () =>
        this.translationsState.set({ loading: false, error: 'Could not load translations.', data: null }),
    });
  }

  private loadBooks(translation: string): void {
    this.booksState.set({ loading: true, error: null, data: null });
    this.bibleService.getBooks(translation).subscribe({
      next: (data) => this.booksState.set({ loading: false, error: null, data }),
      error: () =>
        this.booksState.set({ loading: false, error: 'Could not load books for this translation.', data: null }),
    });
  }

  private loadChapters(bookId: string): void {
    this.chaptersState.set({ loading: true, error: null, data: null });
    this.bibleService.getChapters(bookId, this.selectedTranslation()).subscribe({
      next: (data) => this.chaptersState.set({ loading: false, error: null, data }),
      error: () =>
        this.chaptersState.set({ loading: false, error: 'Could not load chapters for this book.', data: null }),
    });
  }

  private loadVerses(bookId: string, chapter: number): void {
    this.versesState.set({ loading: true, error: null, data: null });
    this.bibleService.getVerses(bookId, chapter, this.selectedTranslation()).subscribe({
      next: (data) => this.versesState.set({ loading: false, error: null, data }),
      error: () =>
        this.versesState.set({ loading: false, error: 'Could not load this chapter.', data: null }),
    });
  }

  // ---------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------

  onTranslationChange(id: string): void {
    this.selectedTranslation.set(id);
    this.selectedBook.set(null);
    this.selectedChapter.set(null);
    this.versesState.set(initialAsyncState());
    this.viewMode.set('books');
    this.loadBooks(id);
  }

  selectBook(book: BibleBook): void {
    this.selectedBook.set(book);
    this.selectedChapter.set(null);
    this.verseRangeLabel.set(null);
    this.viewMode.set('chapters');
    this.loadChapters(book.id);
  }

  selectChapter(chapter: number): void {
    const book = this.selectedBook();
    if (!book) return;
    this.selectedChapter.set(chapter);
    this.verseRangeLabel.set(null);
    this.viewMode.set('verses');
    this.loadVerses(book.id, chapter);
  }

  backToBooks(): void {
    this.viewMode.set('books');
    this.selectedBook.set(null);
    this.selectedChapter.set(null);
  }

  backToChapters(): void {
    this.viewMode.set('chapters');
    this.selectedChapter.set(null);
    this.verseRangeLabel.set(null);
  }

  // ---------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.activeSuggestionIndex.set(-1);
    this.showSuggestions.set(value.trim().length > 0);
    this.searchError.set(null);
  }

  onSearchFocus(): void {
    if (this.searchQuery().trim().length > 0) {
      this.showSuggestions.set(true);
    }
  }

  onSearchBlur(): void {
    // Delay so a suggestion click registers before the list disappears.
    setTimeout(() => this.showSuggestions.set(false), 150);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const suggestions = this.bookSuggestions();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!suggestions.length) return;
      this.activeSuggestionIndex.set((this.activeSuggestionIndex() + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!suggestions.length) return;
      this.activeSuggestionIndex.set(
        (this.activeSuggestionIndex() - 1 + suggestions.length) % suggestions.length,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const index = this.activeSuggestionIndex();
      if (index >= 0 && suggestions[index]) {
        this.selectSuggestion(suggestions[index]);
      } else {
        this.submitSearch();
      }
    } else if (event.key === 'Escape') {
      this.showSuggestions.set(false);
    }
  }

  selectSuggestion(book: BibleBook): void {
    this.searchQuery.set(book.name);
    this.showSuggestions.set(false);
    this.selectBook(book);
  }

  submitSearch(): void {
    const query = this.searchQuery().trim();
    if (!query) return;
    this.showSuggestions.set(false);
    this.searchError.set(null);

    const books = this.booksState().data ?? [];
    const parsed = this.bibleService.parseReference(query);

    if (parsed) {
      const matchedBook = this.resolveBook(parsed.book, books);
      if (!matchedBook) {
        this.searchError.set(`Couldn't find a book matching "${parsed.book}".`);
        return;
      }

      this.selectedBook.set(matchedBook);

      if (parsed.verse) {
        // Single verse or a range (e.g. John 3:16 or John 3:16-18)
        this.versesState.set({ loading: true, error: null, data: null });
        this.selectedChapter.set(parsed.chapter);
        this.viewMode.set('verses');
        this.verseRangeLabel.set(
          parsed.verseEnd ? `${parsed.verse}-${parsed.verseEnd}` : `${parsed.verse}`,
        );
        this.bibleService.getVerseByReference(parsed, this.selectedTranslation()).subscribe({
          next: (data) => this.versesState.set({ loading: false, error: null, data }),
          error: () =>
            this.versesState.set({ loading: false, error: "Couldn't find that reference.", data: null }),
        });
      } else {
        // Whole chapter (e.g. "John 3")
        this.selectedChapter.set(parsed.chapter);
        this.verseRangeLabel.set(null);
        this.viewMode.set('verses');
        this.loadVerses(matchedBook.id, parsed.chapter);
      }
      return;
    }

    // No chapter/verse given — treat the input as a book name lookup.
    const matchedBook = this.resolveBook(query, books);
    if (matchedBook) {
      this.selectBook(matchedBook);
    } else {
      this.searchError.set(`No book, chapter, or verse found for "${query}".`);
    }
  }

  private resolveBook(name: string, books: BibleBook[]): BibleBook | null {
    const target = name.trim().toLowerCase();
    return (
      books.find((b) => b.name.toLowerCase() === target) ??
      books.find((b) => b.name.toLowerCase().startsWith(target)) ??
      books.find((b) => b.name.toLowerCase().includes(target)) ??
      null
    );
  }
}

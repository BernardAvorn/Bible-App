import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay, of } from 'rxjs';
import {
  BibleBook,
  BibleChapter,
  BibleTranslation,
  BibleVerse,
  BooksResponse,
  ChaptersResponse,
  RandomVerseResult,
  TranslationsResponse,
  VerseReference,
  VersesResponse,
} from '../models/bible.models';

/**
 * Single source of truth for all bible-api.com "/data" calls.
 *
 * Responsibilities:
 *  - Own the base URL and every endpoint shape in one place.
 *  - Cache list-style responses (translations/books/chapters) per
 *    translation with shareReplay, since they never change mid-session
 *    and are re-requested often (translation switcher, autocomplete, etc).
 *  - Normalize the random-verse endpoint, whose envelope can vary,
 *    into a single predictable RandomVerseResult shape.
 */
@Injectable({ providedIn: 'root' })
export class BibleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://bible-api.com';

  /** Default translation used across the app (World English Bible). */
  readonly defaultTranslation = 'web';

  private translationsCache$?: Observable<BibleTranslation[]>;
  private readonly booksCache = new Map<string, Observable<BibleBook[]>>();
  private readonly chaptersCache = new Map<string, Observable<BibleChapter[]>>();

  /** GET /data — list of every supported translation. */
  getTranslations(): Observable<BibleTranslation[]> {
    if (!this.translationsCache$) {
      this.translationsCache$ = this.http
        .get<TranslationsResponse>(`${this.baseUrl}/data`)
        .pipe(
          map((res) => res.translations),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.translationsCache$;
  }

  /** GET /data/{translation} — every book available in that translation. */
  getBooks(translation: string = this.defaultTranslation): Observable<BibleBook[]> {
    if (!this.booksCache.has(translation)) {
      const req$ = this.http
        .get<BooksResponse>(`${this.baseUrl}/data/${translation}`)
        .pipe(
          map((res) => res.books),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
      this.booksCache.set(translation, req$);
    }
    return this.booksCache.get(translation)!;
  }

  /** GET /data/{translation}/{book} — every chapter in that book. */
  getChapters(bookId: string, translation: string = this.defaultTranslation): Observable<BibleChapter[]> {
    const cacheKey = `${translation}:${bookId}`;
    if (!this.chaptersCache.has(cacheKey)) {
      const req$ = this.http
        .get<ChaptersResponse>(`${this.baseUrl}/data/${translation}/${bookId}`)
        .pipe(
          map((res) => res.chapters),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
      this.chaptersCache.set(cacheKey, req$);
    }
    return this.chaptersCache.get(cacheKey)!;
  }

  /** GET /data/{translation}/{book}/{chapter} — every verse in that chapter. */
  getVerses(
    bookId: string,
    chapter: number,
    translation: string = this.defaultTranslation,
  ): Observable<BibleVerse[]> {
    return this.http
      .get<VersesResponse>(`${this.baseUrl}/data/${translation}/${bookId}/${chapter}`)
      .pipe(map((res) => res.verses));
  }

  /**
   * GET /data/{translation}/random — a random verse.
   * The response envelope isn't perfectly consistent across API versions,
   * so this normalizes a few known shapes into RandomVerseResult.
   */
  getRandomVerse(translation: string = this.defaultTranslation): Observable<RandomVerseResult> {
    return this.http.get<any>(`${this.baseUrl}/data/${translation}/random`).pipe(
      map((res) => this.normalizeRandomVerse(res)),
    );
  }

  /**
   * GET /{Book}%20{Chapter}:{Verse} — classic reference lookup, used for
   * direct search (e.g. "John 3:16") and multi-verse ranges ("John 3:16-18").
   */
  getVerseByReference(reference: VerseReference, translation: string = this.defaultTranslation): Observable<BibleVerse[]> {
    const range = reference.verse
      ? `${reference.verse}${reference.verseEnd ? `-${reference.verseEnd}` : ''}`
      : '';
    const path = `${reference.book} ${reference.chapter}${range ? `:${range}` : ''}`;
    const encoded = encodeURIComponent(path);
    return this.http
      .get<any>(`${this.baseUrl}/${encoded}?translation=${translation}`)
      .pipe(
        map((res) => {
          // Classic API returns { verses: [{ book_id, book_name, chapter, verse, text }] }
          const verses = res.verses ?? [];
          return verses.map((v: any) => ({
            book_id: v.book_id,
            book: v.book_name ?? v.book,
            chapter: v.chapter,
            verse: v.verse,
            text: v.text,
          })) as BibleVerse[];
        }),
      );
  }

  /**
   * Parses free-text search input like "John 3:16", "John 3:16-18", or
   * just "John 3" into a structured VerseReference. Returns null when the
   * input doesn't look like a reference yet (still mid-typing).
   */
  parseReference(input: string): VerseReference | null {
    const trimmed = input.trim();
    const match = trimmed.match(/^([1-3]?\s?[A-Za-z ]+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
    if (!match) return null;
    const [, book, chapter, verse, verseEnd] = match;
    return {
      book: book.trim(),
      chapter: Number(chapter),
      verse: verse ? Number(verse) : undefined,
      verseEnd: verseEnd ? Number(verseEnd) : undefined,
    };
  }

  private normalizeRandomVerse(res: any): RandomVerseResult {
    const translation = res.translation ?? {
      identifier: this.defaultTranslation,
      name: res.translation_name ?? 'World English Bible',
      language: 'English',
      language_code: 'eng',
      license: 'Public Domain',
    };

    // Try every shape we've seen this endpoint return, in order of likelihood.
    const raw =
      res.random_verse ??
      res.verse ??
      (Array.isArray(res.verses) ? res.verses[0] : null) ??
      res;

    const verse: BibleVerse = {
      book_id: raw.book_id ?? raw.bookId ?? '',
      book: raw.book ?? raw.book_name ?? '',
      chapter: raw.chapter,
      verse: raw.verse,
      text: (raw.text ?? '').trim(),
    };

    return { translation, verse };
  }
}

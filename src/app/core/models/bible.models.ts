/**
 * Domain models for the bible-api.com "/data" API surface.
 * Kept close to the raw API shape, with a few app-friendly
 * derived types (e.g. VerseReference) layered on top.
 */

/** A single translation as listed by GET /data */
export interface BibleTranslation {
  identifier: string;
  name: string;
  language: string;
  language_code: string;
  license: string;
  url: string;
}

export interface TranslationsResponse {
  translations: BibleTranslation[];
}

/** A single book as listed by GET /data/{translation} */
export interface BibleBook {
  id: string;
  name: string;
  url: string;
}

export interface BooksResponse {
  translation: TranslationSummary;
  books: BibleBook[];
}

/** A single chapter as listed by GET /data/{translation}/{book} */
export interface BibleChapter {
  book_id: string;
  book: string;
  chapter: number;
  url: string;
}

export interface ChaptersResponse {
  translation: TranslationSummary;
  chapters: BibleChapter[];
}

/** A single verse as returned by GET /data/{translation}/{book}/{chapter} */
export interface BibleVerse {
  book_id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface VersesResponse {
  translation: TranslationSummary;
  verses: BibleVerse[];
}

/** Slimmed-down translation info embedded in nested responses */
export interface TranslationSummary {
  identifier: string;
  name: string;
  language: string;
  language_code: string;
  license: string;
}

/**
 * The random-verse endpoint's exact envelope isn't 100% fixed across
 * deployments, so the service normalizes whatever comes back (a single
 * verse object, or a `verses` array) into this shape for consumers.
 */
export interface RandomVerseResult {
  translation: TranslationSummary;
  verse: BibleVerse;
}

/** A parsed "Book Chapter:Verse" style reference, e.g. John 3:16 */
export interface VerseReference {
  book: string;
  chapter: number;
  verse?: number;
  verseEnd?: number;
}

/** UI-facing loading state wrapper used by feature components */
export interface AsyncState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

export function initialAsyncState<T>(): AsyncState<T> {
  return { loading: false, error: null, data: null };
}

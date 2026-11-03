import { normalizeIsbn } from "@varaq/shared";

export type BookMetadata = {
  isbn: string;
  title: string;
  authors: string[];
  publisher?: string;
  genres?: string[];
  coverUrl?: string;
};

/** External ISBN metadata source. Returns null when the book is unknown or the source is down. */
export type MetadataProvider = { lookup(isbn: string): Promise<BookMetadata | null> };

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers: { "user-agent": "Pa-Varaq/0.1 (open-source book lending)" },
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

const openLibrary: MetadataProvider = {
  async lookup(isbn) {
    const data = await getJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    const b = data?.[`ISBN:${isbn}`];
    if (!b?.title) return null;
    return {
      isbn,
      title: b.title,
      authors: (b.authors ?? []).map((a: { name: string }) => a.name),
      publisher: b.publishers?.[0]?.name,
      genres: (b.subjects ?? []).slice(0, 4).map((s: { name: string }) => s.name),
      coverUrl: b.cover?.medium,
    };
  },
};

const googleBooks: MetadataProvider = {
  async lookup(isbn) {
    const data = await getJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`);
    const v = data?.items?.[0]?.volumeInfo;
    if (!v?.title) return null;
    return {
      isbn,
      title: v.title,
      authors: v.authors ?? [],
      publisher: v.publisher,
      genres: v.categories?.slice(0, 4),
      coverUrl: v.imageLinks?.thumbnail?.replace("http://", "https://"),
    };
  },
};

/** Tries each provider in order and returns the first hit. */
export function chainProviders(...providers: MetadataProvider[]): MetadataProvider {
  return {
    async lookup(raw) {
      const isbn = normalizeIsbn(raw);
      for (const p of providers) {
        const hit = await p.lookup(isbn);
        if (hit) return hit;
      }
      return null;
    },
  };
}

export const defaultMetadataProvider = chainProviders(openLibrary, googleBooks);

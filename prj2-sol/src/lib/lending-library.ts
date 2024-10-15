import { Errors } from 'cs544-js-utils';

import { LibraryDao } from './library-dao.js';
import * as Lib from './library.js';
import { BOOKS } from 'src/test/test-data.js';

/** Note that errors are documented using the `code` option which must be
 *  returned (the `message` can be any suitable string which describes
 *  the error as specifically as possible).  Whenever possible, the
 *  error should also contain a `widget` option specifying the widget
 *  responsible for the error).
 *
 *  Note also that the underlying DAO should not normally require a
 *  sequential scan over all books or patrons.
 */


/************************ Main Implementation **************************/

export function makeLendingLibrary(dao: LibraryDao) {
  return new LendingLibrary(dao);
}

export class LendingLibrary {

  constructor(private readonly dao: LibraryDao) {
  }

  /** clear out underlying db */
  async clear() : Promise<Errors.Result<void>> {
    // return Errors.errResult('TODO');
    try {
      await this.dao.clearDatabase(); // create method in library-dao for clearing
      return Errors.okResult(undefined);
    }
    catch (error) {
      return Errors.errResult(error.message, 'DB');
    }
  }

  /** Add one-or-more copies of book represented by req to this library.
   *  If the book is already in the library and consistent with the book
   *  being added, then the nCopies of the book is simply updated by
   *  the nCopies of the object being added (default 1).
   *
   *  Errors:
   *    MISSING: one-or-more of the required fields is missing.
   *    BAD_TYPE: one-or-more fields have the incorrect type.
   *    BAD_REQ: other issues, like:
   *      "nCopies" or "pages" not a positive integer.
   *      "year" is not integer in range [1448, currentYear]
   *      "isbn" is not in ISBN-10 format of the form ddd-ddd-ddd-d
   *      "title" or "publisher" field is empty.
   *      "authors" array is empty or contains an empty author
   *      book is already in library but data in req is 
   *      inconsistent with the data already present.
   */
  async addBook(req: Record<string, any>): Promise<Errors.Result<Lib.XBook>> {
    try {
      const requiredFields = ['isbn', 'title', 'pages', 'authors', 'publisher', 'year', 'nCopies'];
      for (const field of requiredFields) {
        if (!(field in req)) {
          return Errors.errResult('Missing required field: ${field}', 'MISSING');
        }
      }

      if (typeof req.isbn !== 'string') {
        return Errors.errResult('ISBN must be a string', 'BAD_TYPE');
      }
      if (!/^\d{3}-\d{3}-\d{3}-\d{1}$/.test(req.isbn)) {
        return Errors.errResult('Invalid ISBN format, must be in ISBN-10 format: ddd-ddd-ddd-d', 'BAD_REQ');
      }
      if (typeof req.title !== 'string') {
        return Errors.errResult('Title must be a string', 'BAD_TYPE');
      }
      if (req.title.trim() === '') {
        return Errors.errResult('Title cannot be empty', 'BAD_REQ');
      }
      if (typeof req.pages !== 'number' || !Number.isInteger(req.pages) || req.pages <= 0) {
        return Errors.errResult('Pages must be a positive integer', 'BAD_TYPE');
      }
      if (!Array.isArray(req.authors)) {
        return Errors.errResult('Authors must be an array', 'BAD_TYPE');
      }
      if (req.authors.length === 0 || req.authors.some(a => typeof a !== 'string' || a.trim() === '')) {
        return Errors.errResult('Authors array cannot be empty or contain an empty author', 'BAD_REQ');
      }
      if (typeof req.publisher !== 'string') {
        return Errors.errResult('Publisher must be a string', 'BAD_TYPE');
      }
      if (req.publisher.trim() === '') {
        return Errors.errResult('Publisher cannot be empty', 'BAD_REQ');
      }
      if (typeof req.year !== 'number') {
        return Errors.errResult('Year must be a number', 'BAD_TYPE');
      }
      if (req.year < 1448 || req.year > new Date().getFullYear()) {
        return Errors.errResult('Year must be in range [1448, currentYear]', 'BAD_REQ');
      }
      if (typeof req.nCopies !== 'number' || !Number.isInteger(req.nCopies) || req.nCopies <= 0) {
        return Errors.errResult('nCopies must be a positive integer', 'BAD_TYPE');
      }

      const book: Lib.XBook = {
        isbn: req.isbn,
        title: req.title,
        pages: req.pages,
        authors: req.authors,
        publisher: req.publisher,
        year: req.year,
        nCopies: req.nCopies
      };

      const result = await this.dao.addBook(book); // make addBook method in library-dao
      return result;
    }
    catch (error) {
      return Errors.errResult(error.message, 'DB');
    }
    // return Errors.errResult('TODO');
  }

  /** Return all books whose authors and title fields contain all
   *  "words" in req.search, where a "word" is a max sequence of /\w/
   *  of length > 1.  Note that word matching must be case-insensitive,
   *  but can depend on any stemming rules of the underlying database.
   *  
   *  The req can optionally contain non-negative integer fields
   *  index (default 0) and count (default DEFAULT_COUNT).  The
   *  returned results are a slice of the sorted results from
   *  [index, index + count).  Note that this slicing *must* be
   *  performed by the database.
   *
   *  Returned books should be sorted in ascending order by title.
   *  If no books match the search criteria, then [] should be returned.
   *
   *  Errors:
   *    MISSING: search field is missing
   *    BAD_TYPE: search field is not a string or index/count are not numbers.
   *    BAD_REQ: no words in search, index/count not int or negative.
   */
  async findBooks(req: Record<string, any>) : Promise<Errors.Result<Lib.XBook[]>>
  {
    try {
      if (!req.search || typeof req.search !== 'string') {
        return Errors.errResult('Search field is missing or not a string', 'MISSING');
      }

      const index = typeof req.index === 'number' && req.index >= 0 ? req.index : 0;
      const count = typeof req.count === 'number' && req.count >= 0 ? req.count : DEFAULT_COUNT;

      const searchWords = req.search.match(/\w{2,}/g) || [];
      if (searchWords.length === 0) {
        return Errors.errResult('No valid search words found', 'BAD_REQ');
      }

      const books = await this.dao.findBooksBySearch(searchWords, index, count); // create method in library-dao
      return books;
    }
    catch (error) {
      return Errors.errResult(error.message, 'DB');
    }
    // return Errors.errResult('TODO');
  }


  /** Set up patron req.patronId to check out book req.isbn. 
   * 
   *  Errors:
   *    MISSING: patronId or isbn field is missing
   *    BAD_TYPE: patronId or isbn field is not a string.
   *    BAD_REQ: invalid isbn or error on business rule violation, like:
   *      isbn does not specify a book in the library
   *      no copies of the book are available for checkout
   *      patron already has a copy of the same book checked out
   */
  async checkoutBook(req: Record<string, any>) : Promise<Errors.Result<void>> {
    try {
      const {patronId, isbn} = req;
      if (!patronId || typeof patronId !== 'string') {
        return Errors.errResult('Missing or invalid patronId', 'MISSING');
      }
      if (!isbn || typeof isbn !== 'string') {
        return Errors.errResult('Missing or invalid ISBN', 'MISSING');
      }

      const result = await this.dao.checkoutBook(patronId, isbn); // make method
      if (!result.isOk) {
        return Errors.errResult('Issue checking out this book', 'BAD_REQ');
      }
      return Errors.okResult(undefined);
    }
    catch (error) {
      return Errors.errResult(error.message, 'DB');
    }
    // return Errors.errResult('TODO');
  }

  /** Set up patron req.patronId to returns book req.isbn.
   *  
   *  Errors:
   *    MISSING: patronId or isbn field is missing
   *    BAD_TYPE: patronId or isbn field is not a string.
   *    BAD_REQ: invalid isbn or error on business rule violation like
   *    isbn does not specify a book in the library or there is
   *    no checkout of the book by patronId.
   */
  async returnBook(req: Record<string, any>) : Promise<Errors.Result<void>> {
    try {
      const {patronId, isbn} = req;
      if (!patronId || typeof patronId !== 'string') {
        return Errors.errResult('Missing or invalid patronId', 'MISSING');
      }
      if (!isbn || typeof isbn !== 'string') {
        return Errors.errResult('Missing or invalid ISBN', 'MISSING');
      }

      const result = await this.dao.returnBook(patronId, isbn); // make method
      if (!result.isOk) {
        return Errors.errResult('Issue returning this book', 'BAD_REQ');
      }
      return Errors.okResult(undefined);
    }
    catch (error) {
      return Errors.errResult(error.message, 'DB');
    }
    // return Errors.errResult('TODO');
  }

  //add class code as needed

}

// default count for find requests
const DEFAULT_COUNT = 5;

//add file level code as needed
  

/********************** Domain Utility Functions ***********************/

/** return a field where book0 and book1 differ; return undefined if
 *  there is no such field.
 */
function compareBook(book0: Lib.Book, book1: Lib.Book) : string|undefined {
  if (book0.title !== book1.title) return 'title';
  if (book0.authors.some((a, i) => a !== book1.authors[i])) return 'authors';
  if (book0.pages !== book1.pages) return 'pages';
  if (book0.year !== book1.year) return 'year';
  if (book0.publisher !== book1.publisher) return 'publisher';
}



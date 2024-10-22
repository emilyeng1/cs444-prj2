import * as mongo from 'mongodb';

import { Errors } from 'cs544-js-utils';

import * as Lib from './library.js';

//TODO: define any DB specific types if necessary

interface Patron {
  id: string;
  checkedOutBooks: string[];
}

export async function makeLibraryDao(dbUrl: string): Promise<Errors.Result<LibraryDao>> {
  return await LibraryDao.make(dbUrl);
}

//options for new MongoClient()
const MONGO_OPTIONS = {
  ignoreUndefined: true,  //ignore undefined fields in queries
};


export class LibraryDao {

  // NEW ADDITIONS
  private booksCollection: mongo.Collection<Lib.XBook>;
  private patronCollection: mongo.Collection<Patron>;
  //called by below static make() factory function with
  //parameters to be cached in this instance.
  constructor(private readonly client: mongo.MongoClient) {
    const db = this.client.db();
    this.booksCollection = db.collection<Lib.XBook>('books');
    this.patronCollection = db.collection<Patron>('patrons');
  }

  //static factory function; should do all async operations like
  //getting a connection and creating indexing.  Finally, it
  //should use the constructor to return an instance of this class.
  //returns error code DB on database errors.
  static async make(dbUrl: string): Promise<Errors.Result<LibraryDao>> {
    try {
      const client = await (new mongo.MongoClient(dbUrl, MONGO_OPTIONS)).connect();
      const db = client.db();

      const booksCollection = db.collection<Lib.XBook>('books');
      const patronCollection = db.collection<Patron>('patrons');

      await booksCollection.createIndex({ isbn: 1 }, { unique: true });
      await patronCollection.createIndex({ id: 1 }, { unique: true });
      return Errors.okResult(new LibraryDao(client));
      // return Errors.okResult(new LibraryDao('TODO'));
    }
    catch (error) {
      return Errors.errResult(error.message, 'DB');
    }
  }

  /** close off this DAO; implementing object is invalid after 
   *  call to close() 
   *
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  async close(): Promise<Errors.Result<void>> {
    try {
      await this.client.close();
      return Errors.VOID_RESULT;
    }
    catch (err) {
      return Errors.errResult((err as Error).message, 'DB');
    }
    // return Errors.errResult('TODO');
  }

  //add methods as per your API
  async addBook(book: Lib.XBook): Promise<Errors.Result<Lib.XBook>> {
    try {
      //const booksCollection = this.client.db().collection('books');
      const existingBook = await this.booksCollection.findOne({ isbn: book.isbn });

      if (existingBook) { //added this.
        const updateResult = await this.booksCollection.updateOne({ isbn: book.isbn }, { $inc: { nCopies: book.nCopies } });
        if (!updateResult.matchedCount) {
          return Errors.errResult('Failed to update book copies', 'DB');
        }
      }
      else {
        await this.booksCollection.insertOne(book);
      }

      return Errors.okResult(book);
    }
    catch (error) {
      return Errors.errResult(error.message, 'DB');
    }
  }

  async findBooksBySearch(searchWords: string[], index: number, count: number): Promise<Errors.Result<Lib.XBook[]>> {
    try {
      //added the multiWordSearch thing idk if it's working if ima be fr
      const multiWordSearch = searchWords.length > 1 ? searchWords.join('.*') : searchWords[0];
      const query = {
        $or: [
          //changed this
          { title: { $regex: multiWordSearch, $options: 'i' } },
          { authors: { $regex: multiWordSearch, $options: 'i' } }
        ]
      };

      const rawBooks = await this.booksCollection
        .find(query)
        .skip(index)
        .limit(count)
        .sort({ title: 1 })
        .toArray();

      const books: Lib.XBook[] = rawBooks.map((doc) => {
        return {
          isbn: doc.isbn,
          title: doc.title,
          authors: doc.authors,
          publisher: doc.publisher,
          pages: doc.pages,
          year: doc.year,
          nCopies: doc.nCopies,
        } as Lib.XBook;
      });

      return Errors.okResult(books);
    }
    catch (error) {
      return Errors.errResult(error.message, 'DB');
    }
  }

  async checkoutBook(patronId: string, isbn: string): Promise<Errors.Result<void>> {
    try {
      const book = await this.booksCollection.findOne({ isbn });

      if (!book) {
        return Errors.errResult('Book not found', 'BAD_REQ');
      }
      if (book.nCopies <= 0) {
        return Errors.errResult('No copies available for checkout', 'BAD_REQ');
      }

      const patron = await this.patronCollection.findOne({ id: patronId });
      if (patron && patron.checkedOutBooks.includes(isbn)) {
        return Errors.errResult('Patron already checked out this book', 'BAD_REQ');
      }

      await this.booksCollection.updateOne({ isbn }, { $inc: { nCopies: -1 } });

      await this.patronCollection.updateOne({ id: patronId }, { $addToSet: { checkedOutBooks: isbn } }, { upsert: true });

      return Errors.okResult(undefined);
    }
    catch (error) {
      return Errors.errResult(error.message, 'DB');
    }
  }

  async returnBook(patronId: string, isbn: string): Promise<Errors.Result<void>> {
    try {
      const patron = await this.patronCollection.findOne({ id: patronId });

      if (!patron || !patron.checkedOutBooks.includes(isbn)) {
        return Errors.errResult('No record of this book being checked out by the patron', 'BAD_REQ');
      }

      await this.booksCollection.updateOne({ isbn }, { $inc: { nCopies: 1 } });

      // TODO: fix issue with checkedOutBooks having type never
      // The pull operation can't run otherwise. Might have to do with checkedOutBooks
      // defaulting to type never?
      // await this.patronCollection.updateOne({ id: patronId }, { $pull: { checkedOutBooks: isbn } });
      await this.patronCollection.updateOne({ id: patronId }, { $pull: { checkedOutBooks: isbn } });
      return Errors.okResult(undefined);
    }
    catch (error) {
      return Errors.errResult(error.message, 'DB');
    }
  }

  async clearDatabase(): Promise<Errors.Result<void>> {
    try {
      await this.booksCollection.deleteMany({});
      await this.patronCollection.deleteMany({});
      return Errors.okResult(undefined);
    }
    catch (error) {
      return Errors.errResult(error.message, 'DB');
    }
  }

} //class LibDao

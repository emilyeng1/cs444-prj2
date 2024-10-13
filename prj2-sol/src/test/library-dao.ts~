//will run the project DAO using an in-memory mongodb server
import { MemDao, makeMemDao } from './mem-dao.js';

import { LibraryDao, } from '../lib/library-dao.js';

import * as Lib from '../lib/library.js';

import { BOOKS, } from './test-data.js';

import { assert, expect } from 'chai';

describe('library DAO', () => {

  //mocha will run beforeEach() before each test to set up these variables
  let memDao : MemDao;
  let dao: LibraryDao;
  
  beforeEach(async function () {
    const daoResult = await makeMemDao();
    assert(daoResult.isOk === true);
    memDao = daoResult.val;
    dao = memDao.dao;
  });

  //mocha runs this after each test; we use this to clean up the DAO.
  afterEach(async function () {
    await memDao.tearDown();
  });

  describe('Books', () => {

    it('should add a book without any errors', async () => {
      const result = await dao.addBook({...BOOKS[0]});
      assert(result.isOk === true);
      expect(result.val).to.deep.equal(BOOKS[0]);
    });

    it('should find an added book without any errors', async () => {
      const result = await dao.addBook({...BOOKS[0]});
      assert(result.isOk === true);
      const result1 = await dao.getBook(BOOKS[0].isbn);
      assert(result1.isOk === true);
      expect(result1.val).to.deep.equal(BOOKS[0]);
    });

    it('should find all JavaScript books without any errors', async () => {
      const js = 'javascript';
      for (const book of BOOKS) {
	const result = await dao.addBook(book);
	assert(result.isOk === true);
      }
      const count = 999;
      const result = await dao.findBooks({search: js, count});
      assert(result.isOk === true);
      const foundBooks = result.val;
      const jsBooks = BOOKS.filter(b => b.title.toLowerCase().indexOf(js) >= 0)
	.sort((b1, b2) => b1.title.localeCompare(b2.title));
      expect(foundBooks).to.deep.equal(jsBooks);
    });

    it('should find a subsequence of JavaScript books', async () => {
      const js = 'javascript';
      for (const book of BOOKS) {
	const result = await dao.addBook(book);
	assert(result.isOk === true);
      }
      const [index, count] = [2, 4];
      const result = await dao.findBooks({search: js, count, index});
      assert(result.isOk === true);
      const foundBooks = result.val;
      const jsBooks = BOOKS.filter(b => b.title.toLowerCase().indexOf(js) >= 0)
	.sort((b1, b2) => b1.title.localeCompare(b2.title))
	.slice(index, index + count);
      expect(foundBooks).to.deep.equal(jsBooks);
    });

    it('should find Flanagan\'s JavaScript book', async () => {
      const search = '"javascript" "flanagan"';
      for (const book of BOOKS) {
	const result = await dao.addBook(book);
	assert(result.isOk === true);
      }
      const [index, count] = [0, 999];
      const result = await dao.findBooks({search, count, index});
      assert(result.isOk === true);
      const foundBooks = result.val;
      expect(foundBooks).to.have.length(1);
    });

    it('should not find any JavaScriptX books without any errors', async () => {
      const js = 'javascriptx';
      for (const book of BOOKS) {
	const result = await dao.addBook(book);
	assert(result.isOk === true);
      }
      const count = 999;
      const result = await dao.findBooks({search: js, count});
      assert(result.isOk === true);
      expect(result.val).to.deep.equal([]);
    });

  });

  describe('Lends', () => {

    it('should add a Lend to db', async () => {
      const result = await dao.addLend(LENDS[0]);
      assert(result.isOk === true);
    });
    
    it('should remove a previously added Lend from db', async () => {
      const result = await dao.addLend(LENDS[0]);
      assert(result.isOk === true);
      const result1 = await dao.removeLend(LENDS[0]);
      assert(result1.isOk === true);
    });
    
    it('should not remove an unknown Lend from the db', async () => {
      const result = await dao.removeLend(LENDS[0]);
      assert(result.isOk === false);
    });
    
    it('should find all Lends for a particular isbn', async () => {
      for (const lend of LENDS) {
	const result = await dao.addLend(lend);
	assert(result.isOk === true);
      }
      const isbn = LENDS[0].isbn;
      const result = await dao.findAllLendsByIsbn(isbn);
      assert(result.isOk === true);
      const isbnLends = result.val;
      const expected = LENDS.filter(lend => lend.isbn === isbn)
	.sort((a, b) => a.isbn.localeCompare(b.isbn));
      expect(isbnLends).to.deep.equal(expected);
    });
    
    it('should not find any Lends for a unknown isbn', async () => {
      for (const lend of LENDS) {
	const result = await dao.addLend(lend);
	assert(result.isOk === true);
      }
      const isbn = LENDS[0].isbn + 'x';
      const result = await dao.findAllLendsByIsbn(isbn);
      assert(result.isOk === true);
      const isbnLends = result.val;
      expect(isbnLends).to.deep.equal([]);
    });
    
    it('should find all Lends for a particular patron', async () => {
      for (const lend of LENDS) {
	const result = await dao.addLend(lend);
	assert(result.isOk === true);
      }
      const patronId = LENDS[0].patronId;
      const result = await dao.findAllLendsByPatronId(patronId);
      assert(result.isOk === true);
      const patronLends = result.val;
      const expected = LENDS.filter(lend => lend.patronId === patronId)
	.sort((a, b) => a.isbn.localeCompare(b.isbn));
      expect(patronLends).to.deep.equal(expected);
    });
    
    it('should not find any Lends for a unknown patron', async () => {
      for (const lend of LENDS) {
	const result = await dao.addLend(lend);
	assert(result.isOk === true);
      }
      const patronId = LENDS[0].patronId + 'x';
      const result = await dao.findAllLendsByPatronId(patronId);
      assert(result.isOk === true);
      const patronLends = result.val;
      expect(patronLends).to.deep.equal([]);
    });
    
  });

});


const PATRONS = [ 'joe', 'bill', 'sue', 'anne', 'karen' ];
const ISBNS = BOOKS.slice(0, 5).map(b => b.isbn);
//LENDS = ISBNS x PATRONS
const LENDS = ISBNS.reduce((acc, isbn) => 
  acc.concat(PATRONS.map(patronId => ({ isbn, patronId }))), []);


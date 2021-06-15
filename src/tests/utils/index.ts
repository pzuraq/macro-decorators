import 'mocha';
import { expect } from 'chai';

import { getPath, getPaths, setPath } from '../../utils';

describe('getPath', () => {
  it('works with an absent class member', () => {
    class Foo {}

    let foo = new Foo();

    expect(getPath(foo, 'bar')).to.equal(undefined);
  });

  it('works with a plain class member', () => {
    class Foo {
      foo = 123;
    }

    let foo = new Foo();

    expect(getPath(foo, 'foo')).to.equal(123);
  });

  it('works with an object as a class member', () => {
    class Foo {
      bar = {
        bao: 'bab',
      };
    }

    let foo = new Foo();

    expect(getPath(foo, 'bar')).to.equal(foo.bar);
    expect(getPath(foo, 'bar.bao')).to.equal(foo.bar.bao);
  });
});

describe('getPaths', () => {
  it('works', () => {
    class Foo {
      bar = 1;
      bab = '2';
    }

    let foo = new Foo();

    expect(getPaths(foo, ['bar', 'bab', 'baz'])).to.deep.equal([1, '2', undefined]);
  });
});

describe('setPath', () => {
  it('works with a plain object', () => {
    class Foo {
      bar: any;
    }

    let foo = new Foo();

    setPath(foo, 'bar', 'baz');

    expect(foo.bar).to.equal('baz');
  });

  it('works with an object with setter', () => {
    class Foo {
      set = function() {
        expect(true);
      };
    }

    let foo = new Foo();

    setPath(foo, 'bar', 'baz');
  });

  it('works with nested paths', () => {
    class Foo {
      bar = {
        baz: '',
      };
    }

    let foo = new Foo();

    setPath(foo, 'bar.baz', 'bao');

    expect(foo.bar.baz).to.equal('bao');
  });
});

import 'mocha';
import { expect } from 'chai';

import macro from '..';

describe('@macro', () => {
  it('works with a function', () => {
    class Foo {
      foo = 123;

      @macro((target: Foo) => {
        return target.foo;
      })
      bar!: number;
    }

    let foo = new Foo();

    expect(foo.bar).to.equal(123);
  });

  it('works with a getter', () => {
    class Foo {
      foo = 123;

      @macro({
        get(target: Foo) {
          return target.foo;
        },
      })
      bar!: number;
    }

    let foo = new Foo();

    expect(foo.bar).to.equal(123);
  });

  it('works with a setter', () => {
    class Foo {
      foo = 123;

      @macro({
        set(target: Foo, _key, value) {
          target.foo = value;
        },
      })
      bar!: number;
    }

    let foo = new Foo();

    foo.bar = 456;

    expect(foo.foo).to.equal(456);
  });

  it('does not assign a getter if there is no getter', () => {
    class Foo {
      foo = 123;

      @macro({
        set(target: Foo, _key, value) {
          target.foo = value;
        },
      })
      bar!: number;
    }

    let foo = new Foo();

    expect(foo.bar).to.equal(undefined);
  });

  it('does not assign a setter if there is no setter', () => {
    class Foo {
      foo = 123;

      @macro({
        get(target: Foo) {
          return target.foo;
        },
      })
      bar!: number;
    }

    let foo = new Foo();

    try {
      foo.bar = 123;
    } catch (e) {
      expect(String(e)).to.contain('Cannot set property bar');
    }
  });
});

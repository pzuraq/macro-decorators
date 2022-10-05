import 'mocha';
import { expect } from 'chai';

import {
  alias,
  deprecatingAlias,
  reads,
  overridableReads,
  and,
  bool,
  empty,
  equal,
  gt,
  gte,
  not,
  notEmpty,
  match,
  nullish,
  or,
  lt,
  lte,
  collect,
  diff,
  filter,
  filterBy,
  intersect,
  map,
  mapBy,
  max,
  min,
  sort,
  sortBy,
  sum,
  union,
  unique,
  uniqueBy,
} from '..';

describe('Macros', () => {
  describe('Aliasing', () => {
    it('@alias', () => {
      class Foo {
        foo = 'bar';

        @alias('foo') fooAlias!: string;
      }

      let foo = new Foo();

      expect(foo.foo).to.equal('bar');
      expect(foo.fooAlias).to.equal('bar');

      foo.fooAlias = 'baz';

      expect(foo.foo).to.equal('baz');
      expect(foo.fooAlias).to.equal('baz');

      foo.foo = 'qux';

      expect(foo.foo).to.equal('qux');
      expect(foo.fooAlias).to.equal('qux');
    });

    it('@alias works with Map', () => {
      class Foo {
        foo = new Map([['bar', 'baz']]);

        @alias('foo.bar') barAlias!: string;
      }

      let foo = new Foo();

      expect(foo.foo.get('bar')).to.equal('baz');
      expect(foo.barAlias).to.equal('baz');

      foo.barAlias = 'qux';

      expect(foo.foo.get('bar')).to.equal('qux');
      expect(foo.barAlias).to.equal('qux');

      foo.foo.set('bar', 'quux');

      expect(foo.foo.get('bar')).to.equal('quux');
      expect(foo.barAlias).to.equal('quux');
    });

    it('@alias works with arbitrary classes that implement get and set', () => {
      class SomeClass {
        inner = {
          bar: 'baz',
        };

        get(key: 'bar') {
          return this.inner[key];
        }

        set(key: 'bar', value: string) {
          this.inner[key] = value;
        }
      }

      class Foo {
        foo = new SomeClass();

        @alias('foo.bar') barAlias!: string;
      }

      let foo = new Foo();

      expect(foo.foo.get('bar')).to.equal('baz');
      expect(foo.barAlias).to.equal('baz');

      foo.barAlias = 'qux';

      expect(foo.foo.get('bar')).to.equal('qux');
      expect(foo.barAlias).to.equal('qux');

      foo.foo.set('bar', 'quux');

      expect(foo.foo.get('bar')).to.equal('quux');
      expect(foo.barAlias).to.equal('quux');
    });

    it('@deprecatingAlias', () => {
      let callCount = 0;

      // mock
      let originalWarn = console.warn;
      console.warn = () => callCount++;

      class Foo {
        foo = 'bar';

        @deprecatingAlias('foo', 'foo has been deprecated') fooAlias!: string;
      }

      let foo = new Foo();

      expect(foo.foo).to.equal('bar');
      expect(foo.fooAlias).to.equal('bar');
      expect(callCount).to.equal(1);

      foo.fooAlias = 'baz';
      expect(callCount).to.equal(2);

      expect(foo.foo).to.equal('baz');
      expect(foo.fooAlias).to.equal('baz');
      expect(callCount).to.equal(3);

      // cleanup
      console.warn = originalWarn;
    });

    it('@reads', () => {
      class Foo {
        foo = 'bar';

        @reads('foo') fooReads!: string;
      }

      let foo = new Foo();

      expect(foo.foo).to.equal('bar');
      expect(foo.fooReads).to.equal('bar');

      try {
        foo.fooReads = 'baz';
      } catch (e) {
        expect(e.message).to.equal(
          'Cannot set property fooReads of #<Foo> which has only a getter'
        );
      }
    });

    it('@reads default value', () => {
      class Foo {
        foo?: string;

        @reads('foo', 'bar') fooReads!: string;
      }

      let foo = new Foo();

      expect(foo.foo).to.equal(undefined);
      expect(foo.fooReads).to.equal('bar');

      foo.foo = 'qux';

      expect(foo.foo).to.equal('qux');
      expect(foo.fooReads).to.equal('qux');
    });

    it('@reads default function', () => {
      class Foo {
        foo?: any[];

        @reads('foo', () => []) fooReads!: any[];
      }

      let foo = new Foo();

      let arr = foo.fooReads;

      expect(foo.foo).to.equal(undefined);
      expect(arr).to.be.an('array');
      expect(arr).to.not.equal(foo.fooReads);

      foo.foo = arr;

      expect(foo.foo).to.equal(arr);
      expect(foo.fooReads).to.equal(arr);
    });

    it('@overridableReads', () => {
      class Foo {
        foo = 'bar';

        @overridableReads('foo') fooOverridableReads!: string;
      }

      let foo = new Foo();

      expect(foo.foo).to.equal('bar');
      expect(foo.fooOverridableReads).to.equal('bar');

      foo.fooOverridableReads = 'baz';

      expect(foo.foo).to.equal('bar');
      expect(foo.fooOverridableReads).to.equal('baz');
    });
  });

  describe('Logical Operations', () => {
    it('@and', () => {
      class Foo {
        foo = true;
        bar = true;
        baz = false;

        @and('foo', 'bar') fooAndBar!: boolean;
        @and('foo', 'bar', 'baz') fooAndBarAndBaz!: boolean;
      }

      let foo = new Foo();

      expect(foo.fooAndBar).to.equal(true);
      expect(foo.fooAndBarAndBaz).to.equal(false);
    });

    it('@bool', () => {
      class Foo {
        foo = 123;
        bar = undefined;

        @bool('foo') fooBool!: boolean;
        @bool('bar') barBool!: boolean;
      }

      let foo = new Foo();

      expect(foo.fooBool).to.equal(true);
      expect(foo.barBool).to.equal(false);
    });

    it('@empty', () => {
      class Foo {
        foo: any;

        @empty('foo') fooEmpty!: boolean;
      }

      let foo = new Foo();

      expect(foo.fooEmpty).to.equal(true);

      foo.foo = '';
      expect(foo.fooEmpty).to.equal(true);

      foo.foo = [];
      expect(foo.fooEmpty).to.equal(true);

      foo.foo = false;
      expect(foo.fooEmpty).to.equal(true);

      foo.foo = true;
      expect(foo.fooEmpty).to.equal(false);

      foo.foo = 'aoeu';
      expect(foo.fooEmpty).to.equal(false);

      foo.foo = 123;
      expect(foo.fooEmpty).to.equal(false);

      foo.foo = [1];
      expect(foo.fooEmpty).to.equal(false);
    });

    it('@equal', () => {
      class Foo {
        foo = 123;

        @equal('foo', 123) fooIs123!: boolean;
        @equal('foo', 'bar') fooIsBar!: boolean;
      }

      let foo = new Foo();

      expect(foo.fooIs123).to.equal(true);
      expect(foo.fooIsBar).to.equal(false);
    });

    it('@gt', () => {
      class Foo {
        foo = 1;

        @gt('foo', 0) fooGt0!: boolean;
        @gt('foo', 1) fooGt1!: boolean;
      }

      let foo = new Foo();

      expect(foo.fooGt0).to.equal(true);
      expect(foo.fooGt1).to.equal(false);
    });

    it('@gte', () => {
      class Foo {
        foo = 0;

        @gte('foo', 0) fooGte0!: boolean;
        @gte('foo', 1) fooGte1!: boolean;
      }

      let foo = new Foo();

      expect(foo.fooGte0).to.equal(true);
      expect(foo.fooGte1).to.equal(false);
    });

    it('@not', () => {
      class Foo {
        foo = 123;
        bar = undefined;
        baz = false;

        @not('foo') notFoo!: boolean;
        @not('bar') notBar!: boolean;
        @not('baz') notBaz!: boolean;
      }

      let foo = new Foo();

      expect(foo.notFoo).to.equal(false);
      expect(foo.notBar).to.equal(true);
      expect(foo.notBaz).to.equal(true);
    });

    it('@notEmpty', () => {
      class Foo {
        foo: any;

        @notEmpty('foo') fooNotEmpty!: boolean;
      }

      let foo = new Foo();

      expect(foo.fooNotEmpty).to.equal(false);

      foo.foo = '';
      expect(foo.fooNotEmpty).to.equal(false);

      foo.foo = [];
      expect(foo.fooNotEmpty).to.equal(false);

      foo.foo = false;
      expect(foo.fooNotEmpty).to.equal(false);

      foo.foo = true;
      expect(foo.fooNotEmpty).to.equal(true);

      foo.foo = 'aoeu';
      expect(foo.fooNotEmpty).to.equal(true);

      foo.foo = 123;
      expect(foo.fooNotEmpty).to.equal(true);

      foo.foo = [1];
      expect(foo.fooNotEmpty).to.equal(true);
    });

    it('@match', () => {
      class Foo {
        foo = 'aoeu';

        @match('foo', /aoe./) fooMatch1!: boolean;
        @match('foo', /aoe../) fooMatch2!: boolean;
      }

      let foo = new Foo();

      expect(foo.fooMatch1).to.equal(true);
      expect(foo.fooMatch2).to.equal(false);
    });

    it('@nullish', () => {
      class Foo {
        foo = false;
        bar = undefined;
        baz = null;

        @nullish('foo') fooNullish!: boolean;
        @nullish('bar') barNullish!: boolean;
        @nullish('baz') bazNullish!: boolean;
      }

      let foo = new Foo();

      expect(foo.fooNullish).to.equal(false);
      expect(foo.barNullish).to.equal(true);
      expect(foo.bazNullish).to.equal(true);
    });

    it('@or', () => {
      class Foo {
        foo = false;
        bar = false;
        baz = true;

        @or('foo', 'bar') fooOrBar!: boolean;
        @or('foo', 'bar', 'baz') fooOrBarOrBaz!: boolean;
      }

      let foo = new Foo();

      expect(foo.fooOrBar).to.equal(false);
      expect(foo.fooOrBarOrBaz).to.equal(true);
    });

    it('@or - nested properties', () => {
      class Foo {
        foo = false;
        bar = false;
        baz = true;
      }
      class Qux {
        qux = new Foo();

        @or('qux.foo', 'qux.bar') fooOrBar!: boolean;
        @or('qux.foo', 'qux.bar', 'qux.baz') fooOrBarOrBaz!: boolean;
      }

      let qux = new Qux();

      expect(qux.fooOrBar).to.equal(false);
      expect(qux.fooOrBarOrBaz).to.equal(true);
    });

    it('@lt', () => {
      class Foo {
        foo = 0;

        @lt('foo', 0) fooLt0!: boolean;
        @lt('foo', 1) fooLt1!: boolean;
      }

      let foo = new Foo();

      expect(foo.fooLt0).to.equal(false);
      expect(foo.fooLt1).to.equal(true);
    });

    it('@lte', () => {
      class Foo {
        foo = 1;

        @lte('foo', 0) fooLte0!: boolean;
        @lte('foo', 1) fooLte1!: boolean;
      }

      let foo = new Foo();

      expect(foo.fooLte0).to.equal(false);
      expect(foo.fooLte1).to.equal(true);
    });
  });

  describe('Arrays', () => {
    it('@collect', () => {
      class Foo {
        foo = 1;
        bar = 2;
        baz = 3;

        @collect('foo', 'bar', 'baz') fooBarBaz!: number[];
      }

      let foo = new Foo();

      expect(foo.fooBarBaz).to.deep.equal([1, 2, 3]);
    });

    it('@diff', () => {
      class Foo {
        foo = [1, 2, 3];
        bar = [2];
        baz = [3];
        empty = null;

        @diff('foo', 'bar', 'baz', 'empty') fooBarBaz!: number[];
      }

      let foo = new Foo();

      expect(foo.fooBarBaz).to.deep.equal([1]);
    });

    it('@filter', () => {
      class Foo {
        foo = [1, 2, 3];
        empty = null;

        @filter('foo', i => i === 1) fooFiltered!: number[];
        @filter('empty', i => i === 1) emptyFiltered!: number[];
      }

      let foo = new Foo();

      expect(foo.fooFiltered).to.deep.equal([1]);
      expect(foo.emptyFiltered).to.deep.equal([]);
    });

    it('@filterBy', () => {
      class Foo {
        foo = [{ num: 1 }, { num: 0 }, { num: 0 }];
        empty = null;

        @filterBy('foo', 'num') fooFiltered!: number[];
        @filterBy('empty', 'num') emptyFiltered!: number[];
      }

      let foo = new Foo();

      expect(foo.fooFiltered).to.deep.equal([{ num: 1 }]);
      expect(foo.emptyFiltered).to.deep.equal([]);
    });

    it('@filterBy value', () => {
      class Foo {
        foo = [{ num: 1 }, { num: 2 }, { num: 3 }];

        @filterBy('foo', 'num', 2) fooFiltered!: number[];
      }

      let foo = new Foo();

      expect(foo.fooFiltered).to.deep.equal([{ num: 2 }]);
    });

    it('@intersect', () => {
      class Foo {
        foo = [1, 2];
        bar = [1, 3];
        baz = [1, 4];
        empty = null;

        @intersect('foo', 'bar', 'baz') fooBarBaz!: number[];
        @intersect('foo', 'empty', 'baz') fooEmptyBaz!: number[];
      }

      let foo = new Foo();

      expect(foo.fooBarBaz).to.deep.equal([1]);
      expect(foo.fooEmptyBaz).to.deep.equal([]);
    });

    it('@map', () => {
      class Foo {
        foo = [1, 2, 3];
        empty = null;

        @map('foo', i => i + 1) fooMapped!: number[];
        @map('empty', i => i + 1) emptyMapped!: number[];
      }

      let foo = new Foo();

      expect(foo.fooMapped).to.deep.equal([2, 3, 4]);
      expect(foo.emptyMapped).to.deep.equal([]);
    });

    it('@mapBy', () => {
      class Foo {
        foo = [{ num: 1 }, { num: 2 }, { num: 3 }];
        empty = null;

        @mapBy('foo', 'num') fooMapped!: number[];
        @mapBy('empty', 'num') emptyMapped!: number[];
      }

      let foo = new Foo();

      expect(foo.fooMapped).to.deep.equal([1, 2, 3]);
      expect(foo.emptyMapped).to.deep.equal([]);
    });

    it('@max', () => {
      class Foo {
        foo = [1, 2, 3];
        empty = null;

        @max('foo') fooMax!: number[];
        @max('empty') emptyMax!: number[];
      }

      let foo = new Foo();

      expect(foo.fooMax).to.equal(3);
      expect(foo.emptyMax).to.equal(Math.max());
    });

    it('@min', () => {
      class Foo {
        foo = [1, 2, 3];
        empty = null;

        @min('foo') fooMin!: number[];
        @min('empty') emptyMin!: number[];
      }

      let foo = new Foo();

      expect(foo.fooMin).to.equal(1);
      expect(foo.emptyMin).to.equal(Math.min());
    });

    it('@sort', () => {
      class Foo {
        foo = [1, 2, 3];
        empty = null;

        @sort('foo', (a, b) => (a < b ? 1 : -1)) fooSorted!: number[];
        @sort('empty', (a, b) => (a < b ? 1 : -1)) emptySorted!: number[];
      }

      let foo = new Foo();

      expect(foo.fooSorted).to.deep.equal([3, 2, 1]);
      expect(foo.emptySorted).to.deep.equal([]);

      // Does not modify the original
      expect(foo.foo).to.deep.equal([1, 2, 3]);
    });

    it('@sortBy', () => {
      class Foo {
        foo = [{ num: 3 }, { num: 1 }, { num: 2 }];
        empty = null;

        @sortBy('foo', 'num') fooSorted!: number[];
        @sortBy('empty', 'num') emptySorted!: number[];
      }

      let foo = new Foo();

      expect(foo.fooSorted).to.deep.equal([{ num: 1 }, { num: 2 }, { num: 3 }]);
      expect(foo.emptySorted).to.deep.equal([]);
    });

    it('@sum', () => {
      class Foo {
        foo = [1, 2, 3];
        empty = null;

        @sum('foo') fooSum!: number[];
        @sum('empty') emptySum!: number[];
      }

      let foo = new Foo();

      expect(foo.fooSum).to.equal(6);
      expect(foo.emptySum).to.equal(0);
    });

    it('@union', () => {
      class Foo {
        foo = [1, 2];
        bar = [1, 3];
        baz = [2, 4];
        empty = null;

        @union('foo', 'bar', 'baz', 'empty') fooBarBaz!: number[];
      }

      let foo = new Foo();

      expect(foo.fooBarBaz).to.deep.equal([1, 2, 3, 4]);
    });

    it('@unique', () => {
      class Foo {
        foo = [1, 2, 2, 3];
        empty = null;

        @unique('foo') fooBarBaz!: number[];
        @unique('empty') uniqueEmpty!: number[];
      }

      let foo = new Foo();

      expect(foo.fooBarBaz).to.deep.equal([1, 2, 3]);
      expect(foo.uniqueEmpty).to.deep.equal([]);
    });

    it('@uniqueBy', () => {
      class Foo {
        foo = [{ num: 1 }, { num: 2 }, { num: 2 }, { num: 3 }];
        empty = null;

        @uniqueBy('foo', 'num') fooBarBaz!: number[];
        @uniqueBy('empty', 'num') uniqueEmpty!: number[];
      }

      let foo = new Foo();

      expect(foo.fooBarBaz).to.deep.equal([{ num: 1 }, { num: 2 }, { num: 3 }]);
      expect(foo.uniqueEmpty).to.deep.equal([]);
    });
  });
});

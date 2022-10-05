/**
 * ```typescript
 * import { MacroGetter } from 'macro-decorators';
 * ```
 *
 * A getter for a macro.
 */
export type MacroGetter =
  /**
   * @param obj The instance of the class that the macro was applied to
   * @param key The key of the class field that the macro was applied to
   * @returns The value generated by the macro getter
   */
  (obj: any, key: string | symbol) => any;

/**
 * ```typescript
 * import { MacroSetter } from 'macro-decorators';
 * ```
 *
 * A setter for a macro.
 */
export type MacroSetter =
  /**
   * @param obj The instance of the class that the macro was applied to
   * @param key The key of the class field that the macro was applied to
   * @param value The value to set the macro to
   */
  (obj: any, key: string | symbol, value: any) => void;

/**
 * ```typescript
 * import { MacroDescriptor } from 'macro-decorators';
 * ```
 *
 * A descriptor for a macro. Contains either a macro getter, a macro setter, or
 * both.
 */
export type MacroDescriptor = {
  get?: MacroGetter;
  set?: MacroSetter;
};

/**
 * ```typescript
 * import macro from 'macro-decorators';
 * ```
 *
 * The `@macro` decorator can be used to define custom macro decorators for
 * getters and setters, which can DRY up code that is repetitive and boilerplate
 * heavy.
 *
 * ```ts
 * function fullNameMacro(firstNameKey, lastNameKey) {
 *   return macro(function() {
 *     return `${this[firstNameKey]} ${this[lastNameKey]}`;
 *   });
 * }
 *
 * class Person {
 *   firstName = 'Carol';
 *   lastName = 'Danvers';
 *
 *   @fullNameMacro('firstName', 'lastName')
 *   fullName;
 *
 *   @fullNameMacro('firstName', 'lastName')
 *   properName;
 * }
 *
 * let captainMarvel = new Person();
 * console.log(captainMarvel.fullName); // Carol Danvers
 * ```
 *
 * `macro` receives either [a getter function](#macrogetter), or a
 * [descriptor object](#macrodescriptor) that contains a getter and/or setter:
 *
 * ```ts
 * function fullNameMacro(firstNameKey, lastNameKey) {
 *   return macro({
 *     get() {
 *       return `${this[firstNameKey]} ${this[lastNameKey]}`;
 *     },
 *
 *     set(obj, key, value) {
 *        let [firstName, lastName] = value.split(' ');
 *
 *        this[firstNameKey] = firstName;
 *        this[lastNameKey] = lastName;
 *     }
 *   });
 * }
 *
 * class Person {
 *   firstName = 'Carol';
 *   lastName = 'Danvers';
 *
 *   @fullNameMacro('firstName', 'lastName')
 *   fullName;
 * }
 *
 *
 * let captainMarvel = new Person();
 *
 * console.log(captainMarvel.fullName); // Carol Danvers
 * captainMarvel.fullName = 'Monica Rambeau';
 *
 * console.log(captainMarvel.firstName); // Monica
 * console.log(captainMarvel.lastName); // Rambeau
 * ```
 *
 * The getter and setter functions both receive the class instance as the first
 * argument and the key being accessed as the second. The setter recieves tha
 * value to be set as the third argument. See the definitions for
 * [MacroGetter](#macrogetter) and [MacroSetter](#macrosetter) for more details.
 * Both functions are called with the class instance bound as the `this`
 * context, if possible.
 *
 * @param definition The definition of the macro to apply to the field
 */
export default function macro(definition: MacroGetter | MacroDescriptor): PropertyDecorator {
  let getter: ((obj: any, key: string | symbol) => any) | undefined;
  let setter: ((obj: any, key: string | symbol, value: any) => void) | undefined;

  if (typeof definition === 'function') {
    getter = definition;
  } else {
    getter = definition.get;
    setter = definition.set;
  }

  return function(_target, key) {
    let desc: PropertyDescriptor = {};

    if (getter !== undefined) {
      desc.get = function() {
        return getter!.call(this, this, key);
      };
    }

    if (setter !== undefined) {
      desc.set = function(value) {
        return setter!.call(this, this, key, value);
      };
    }

    return desc;
  };
}

function getPath(obj: any, path: string) {
  let segments = path.split('.');
  let current = obj;

  for (let segment of segments) {
    if (current === undefined || current === null) {
      break;
    }

    current = typeof current.get === 'function' ? current.get(segment) : current[segment];
  }

  return current;
}

function getPaths(obj: any, paths: string[]) {
  return paths.map(p => getPath(obj, p));
}

function setPath(obj: any, path: string, value: any) {
  let objPath = path.substr(0, path.lastIndexOf('.'));
  let key = path.substr(path.lastIndexOf('.') + 1);

  let resolvedObj = objPath ? getPath(obj, objPath) : obj;

  if (typeof resolvedObj.set === 'function') {
    resolvedObj.set(key, value);
  } else {
    resolvedObj[key] = value;
  }
}

// **** Aliasing ****

/**
 * ```typescript
 * import { alias } from 'macro-decorators';
 * ```
 *
 * A macro that aliases another property.
 *
 * ```typescript
 * class Person {
 *   fullName = 'Tony Stark';
 *
 *   @alias('fullName') properName;
 * }
 *
 * let ironMan = new Person();
 * console.log(ironMan.properName); // Tony Stark
 * ```
 *
 * The alias is both ways, so updating the aliased property will also update the
 * original property.
 *
 * ```typescript
 * class Person {
 *   fullName = 'Tony Stark';
 *
 *   @alias('fullName') properName;
 * }
 *
 * let ironMan = new Person();
 * ironMan.properName = 'Anthony Stark';
 * console.log(ironMan.fullName); // Anthony Stark
 * ```
 *
 * @param path The property path to alias
 */
export function alias(path: string): PropertyDecorator {
  return macro({
    get(obj) {
      return getPath(obj, path);
    },

    set(obj, _key, value) {
      setPath(obj, path, value);
    },
  });
}

/**
 * ```typescript
 * import { deprecatingAlias } from 'macro-decorators';
 * ```
 *
 * A macro that aliases another property, but warns the user if they access it.
 * This is useful for renaming properties or warning users of pending
 * deprecations.
 *
 * ```typescript
 * class Person {
 *   fullName = 'Tony Stark';
 *
 *   @deprecatingAlias('fullName', 'No longer necessary since the press conference')
 *   secretIdentity;
 * }
 *
 * let ironMan = new Person();
 * console.log(ironMan.secretIdentity); // Tony Stark
 * ```
 *
 * @param path The property path to alias
 * @param message The warning to log when the property is accessed
 */
export function deprecatingAlias(path: string, message: string): PropertyDecorator {
  return macro({
    get(obj, key) {
      console.warn(`You got ${obj}#${String(key)}, but that value has been deprecated: ${message}`);
      return getPath(obj, path);
    },

    set(obj, key, value) {
      console.warn(`You set ${obj}#${String(key)}, but that value has been deprecated: ${message}`);
      setPath(obj, path, value);
    },
  });
}

/**
 * ```typescript
 * import { reads } from 'macro-decorators';
 * ```
 *
 * A macro that provides a read-only alias to another property.
 *
 * ```typescript
 * class Person {
 *   fullName = 'Tony Stark';
 *
 *   @reads('fullName') properName;
 * }
 *
 * let ironMan = new Person();
 * console.log(ironMan.properName); // Tony Stark
 *
 * ironMan.properName = 'Anthony Stark'; // Throws an error
 * ```
 *
 * A default value can be provided as the second parameter to the decorator. If
 * the value that is aliased is nullish, then the default value will be returned
 * instead:
 *
 * ```typescript
 * class Hero {
 *   ownedBy;
 *
 *   @reads('ownedBy', 'Marvel') universe;
 * }
 *
 * let batman = new Hero();
 * console.log(batman.universe); // Marvel
 *
 * batman.ownedBy = 'DC';
 * console.log(batman.universe); // DC
 * ```
 *
 * If the default value is a function, then the function will be called and its
 * return value will be used instead. This should be used for values like arrays
 * or objects, so they are unique per-instance of the class.
 *
 * ```typescript
 * class Person {
 *   @reads('contacts', () => []) friends;
 * }
 * ```
 *
 * @param path The property path to alias
 * @param defaultValue The default value to set the property to if the aliased
 *   property is nullish. If a function, the function will be called.
 */
export function reads(path: string, defaultValue?: any): PropertyDecorator {
  return macro(obj => {
    let value = getPath(obj, path);

    if (value === null || value === undefined) {
      value = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    }

    return value;
  });
}

/**
 * ```typescript
 * import { overridableReads } from 'macro-decorators';
 * ```
 *
 * A macro that provides an overridable read-only alias to another property.
 * When set, the alias will be overwritten and disconnected from the value that
 * was aliased, disconnecting the two for good.
 *
 * ```typescript
 * class Hero {
 *   ownedBy = 'Disney';
 *
 *   @overridableReads('ownedBy') universe;
 * }
 *
 * let wolverine = new Hero();
 * console.log(wolverine.universe); // Disney
 *
 * wolverine.universe = 'X-men';
 * console.log(wolverine.ownedBy); // Disney
 * console.log(wolverine.universe); // X-men
 * ```
 *
 * @param path The property path to alias
 */
export function overridableReads(path: string): PropertyDecorator {
  return macro({
    get(obj) {
      return getPath(obj, path);
    },

    set(obj, key, value) {
      Object.defineProperty(obj, key, {
        writable: true,
        configurable: true,
        value,
      });
    },
  });
}

// **** Logical Operations ****

function isEmpty(value: any) {
  if (!Boolean(value)) {
    return true;
  } else if (Array.isArray(value) && value.length === 0) {
    return true;
  }

  return false;
}

/**
 * ```typescript
 * import { and } from 'macro-decorators';
 * ```
 *
 * A macro that gets the values of the paths that are passed to it, performs a
 * logical and on them, and returns the result.
 *
 * ```typescript
 * class Person {
 *   hasSuit = true;
 *   hasPowers = false;
 *   hasCoolName = true;
 *
 *   @and('hasSuit', 'hasPowers', 'hasCoolName')
 *   isHero;
 * }
 *
 * let person = new Person();
 * console.log(person.isHero); // false
 *
 * person.hasPowers = true;
 * console.log(person.isHero); // true
 * ```
 *
 * @param paths The paths of the properties to perform the `and` operation on
 */
export function and(...paths: string[]): PropertyDecorator {
  return macro(obj => getPaths(obj, paths).reduce((a, b) => a && b, true));
}

/**
 * ```typescript
 * import { bool } from 'macro-decorators';
 * ```
 *
 * A macro that gets the value of the path that is passed to it, and returns
 * its coerced boolean value.
 *
 * ```typescript
 * class Person {
 *   name;
 *
 *   @bool('name') hasName;
 * }
 *
 * let wonderWoman = new Person();
 * console.log(wonderWoman.hasName); // false
 *
 * person.name = 'Diana Prince';
 * console.log(wonderWoman.hasName); // true
 * ```
 *
 * @param path The path of the property to return the boolean value of
 */
export function bool(path: string): PropertyDecorator {
  return macro(obj => Boolean(getPath(obj, path)));
}

/**
 * ```typescript
 * import { empty } from 'macro-decorators';
 * ```
 *
 * Returns whether or not a field is empty. The field will be considered empty
 * if it is falsy OR if it is an empty array.
 *
 * ```typescript
 * class TodoList {
 *   todos = [];
 *
 *   @empty('todos') done;
 * }
 *
 * let list = new TodoList();
 * console.log(list.done); // true
 *
 * list.todos.push('Stop Thanos');
 * console.log(list.done); // false
 * ```
 *
 * @param path The path of the property to check for emptiness
 */
export function empty(path: string): PropertyDecorator {
  return macro(obj => isEmpty(getPath(obj, path)));
}

/**
 * ```typescript
 * import { equal } from 'macro-decorators';
 * ```
 *
 * A macro that gets the provided path and checks to see if it is equal to the
 * given value.
 *
 * ```typescript
 * class Person {
 *   name;
 *
 *   @equal('name', 'Tony Stark') isIronMan;
 * }
 *
 * let tony = new Person();
 * console.log(tony.isIronMan); // false
 *
 * tony.name = 'Tony Stark';
 * console.log(tony.isIronMan); // true
 * ```
 *
 * @param path The path of the value to compare
 * @param value The value to compare against
 */
export function equal(path: string, value: any): PropertyDecorator {
  return macro(obj => getPath(obj, path) === value);
}

/**
 * ```typescript
 * import { gt } from 'macro-decorators';
 * ```
 *
 * A macro that gets the provided path and compares it to see if it is greater
 * than the given value.
 *
 * ```typescript
 * class Person {
 *   age = 64;
 *
 *   @gt('age', 64) isSeniorCitizen;
 * }
 *
 * let cap = new Person();
 * console.log(cap.isSeniorCitizen); // false;
 *
 * cap.age++;
 * console.log(cap.isSeniorCitizen); // true;
 * ```
 *
 * @param path The path of the value to compare
 * @param value The value to compare against
 */
export function gt(path: string, value: any): PropertyDecorator {
  return macro(obj => getPath(obj, path) > value);
}

/**
 * ```typescript
 * import { gte } from 'macro-decorators';
 * ```
 * A macro that gets the provided path and compares it to see if it is greater
 * than or equal to the given value.
 *
 * ```typescript
 * class Person {
 *   age = 64;
 *
 *   @gte('age', 65) isSeniorCitizen;
 * }
 *
 * let cap = new Person();
 * console.log(cap.isSeniorCitizen); // false;
 *
 * cap.age++;
 * console.log(cap.isSeniorCitizen); // true;
 * ```
 *
 * @param path The path of the value to compare
 * @param value The value to compare against
 */
export function gte(path: string, value: any): PropertyDecorator {
  return macro(obj => getPath(obj, path) >= value);
}

/**
 * ```typescript
 * import { not } from 'macro-decorators';
 * ```
 *
 * A macro that returns the logical not of the provided path.
 *
 * ```typescript
 * class Car {
 *   speed = 0;
 *
 *   @not('speed') isParked;
 * }
 *
 * let batmobile = new Car();
 * console.log(batmobile.isParked); // true
 *
 * batmobile.speed = 100;
 * console.log(batmobile.isParked); // false
 * ```
 *
 * @param path The path of the property to perform the logical not on
 */
export function not(path: string): PropertyDecorator {
  return macro(obj => !getPath(obj, path));
}

/**
 * ```typescript
 * import { notEmpty } from 'macro-decorators';
 * ```
 *
 * Returns whether or not a field is NOT empty. The field will be considered
 * non-empty if it is truthy OR if it is a non-empty array.
 *
 * ```typescript
 * class Person {
 *   frends = [];
 *
 *   @notEmpty('friends') hasFriends;
 * }
 *
 * let hulk = new Person();
 * console.log(hulk.hasFriends); // false
 *
 * hulk.friends.push('Thor');
 * console.log(hulk.hasFriends); // true
 * ```
 *
 * @param path The path of the property to check for non-emptiness
 */
export function notEmpty(path: string): PropertyDecorator {
  return macro(obj => !isEmpty(getPath(obj, path)));
}

/**
 * ```typescript
 * import { match } from 'macro-decorators';
 * ```
 *
 * A macro that returns whether or not the provided path matches a regular
 * expression.
 *
 * ```typescript
 * class Person {
 *   age = 29;
 *
 *   @match('age', /\d+/) ageIsValid;
 * }
 *
 * let person = new Person();
 * console.log(person.ageIsValid); // true
 *
 * person.age = 'twenty-nine';
 * console.log(person.ageIsValid); // false
 * ```
 *
 * @param path The path of the value to match against
 * @param value The regex to match
 */
export function match(path: string, regex: RegExp): PropertyDecorator {
  return macro(obj => regex.test(getPath(obj, path)));
}

/**
 * ```typescript
 * import { nullish } from 'macro-decorators';
 * ```
 *
 * A macro that returns whether or not the provided path is nullish.
 *
 * @param path The path of the property to check for nullish-ness of
 */
export function nullish(path: string): PropertyDecorator {
  return macro(obj => {
    let value = getPath(obj, path);

    return value === null || value === undefined;
  });
}

/**
 * ```typescript
 * import { or } from 'macro-decorators';
 * ```
 *
 * A macro that gets the values of the paths that are passed to it, performs a
 * logical or on them, and returns the result.
 *
 * ```typescript
 * class Person {
 *   hasSuit = false;
 *   hasPowers = false;
 *   hasCoolName = false;
 *   savesLives = false
 *
 *   @or('hasSuit', 'hasPowers', 'hasCoolName', 'savesLives')
 *   isHero;
 * }
 *
 * let person = new Person();
 * console.log(person.isHero); // false
 *
 * person.savesLives = true;
 * console.log(person.isHero); // true
 * ```
 *
 * @param path The paths of the properties to perform the `or` operation on
 */
export function or(...paths: string[]): PropertyDecorator {
  return macro(obj => getPaths(obj, paths).reduce((a, b) => a || b, false));
}

/**
 * ```typescript
 * import { lt } from 'macro-decorators';
 * ```
 *
 * A macro that gets the provided path and compares it to see if it is less than
 * to the given value.
 *
 * ```typescript
 * class Person {
 *   age = 16;
 *
 *   @lt('age', 18) isAKid;
 * }
 *
 * let spidey = new Person();
 * console.log(spidey.isAKid); // true;
 *
 * spidey.age = 18;
 * console.log(spidey.isAKid); // false;
 * ```
 *
 *
 * @param path The path of the value to compare
 * @param value The value to compare against
 */
export function lt(path: string, value: any): PropertyDecorator {
  return macro(obj => getPath(obj, path) < value);
}

/**
 * ```typescript
 * import { lte } from 'macro-decorators';
 * ```
 *
 * A macro that gets the provided path and compares it to see if it is less than
 * or equal to the given value.
 *
 * ```typescript
 * class Person {
 *   age = 16;
 *
 *   @lte('age', 17) isAKid;
 * }
 *
 * let spidey = new Person();
 * console.log(spidey.isAKid); // true;
 *
 * spidey.age = 18;
 * console.log(spidey.isAKid); // false;
 * ```
 *
 *
 * @param path The path of the value to compare
 * @param value The value to compare against
 */
export function lte(path: string, value: any): PropertyDecorator {
  return macro(obj => getPath(obj, path) <= value);
}

// **** Arrays ****
function setFrom(arr: any[]) {
  let set = new Set();

  arr.forEach(v => set.add(v));

  return set;
}

function getArray(obj: any, path: string): any[] {
  return getPath(obj, path) || [];
}

function getArrays(obj: any, paths: string[]): any[][] {
  return paths.map(p => getArray(obj, p));
}

function getValues(set: Set<any>) {
  if (set.values) {
    return Array.from(set);
  }

  let values: any[] = [];

  set.forEach(v => values.push(v));

  return values;
}

/**
 * ```typescript
 * import { collect } from 'macro-decorators';
 * ```
 *
 * A macro that collects the values of one or more property paths and returns
 * them in an array.
 *
 * ```js
 * class Person {
 *   suit;
 *   cape;
 *   helmet;
 *
 *   @collect('suit', 'cape', 'helmet') costumeParts;
 * }
 *
 * let ironMan = new Person();
 * console.log(ironMan.costumeParts); // [undefined, undefined, undefined];
 *
 * ironMan.suit = 'Iron Suit';
 * ironMan.helmet = 'Iron Helmet';
 * console.log(ironMan.costumeParts); // ['Iron Suit', undefined, 'Iron Helmet'];
 * ```
 *
 * @param paths The paths of the properties to collect into the array
 */
export function collect(...paths: string[]): PropertyDecorator {
  return macro(obj => getPaths(obj, paths));
}

/**
 * ```typescript
 * import { diff } from 'macro-decorators';
 * ```
 *
 * A macro that returns a new array with all the items from the first array
 * that are not in any of the other arrays passed to it.
 *
 * ```typescript
 * class Hamster {
 *   likes = [
 *     'banana',
 *     'grape',
 *     'kale'
 *   ];
 *
 *   fruits = [
 *     'grape',
 *     'kale',
 *   ]
 *
 *   @diff('likes', 'fruits') wants;
 * }
 *
 * hamster.wants; // ['banana']
 * ```
 *
 * @param paths The paths of the arrays to diff
 */
export function diff(...paths: string[]): PropertyDecorator {
  return macro(obj => {
    if (paths.length === 0) {
      return [];
    }

    let arrays = getArrays(obj, paths);

    let intersect = arrays.shift() as any[];

    for (let arr of arrays) {
      let values = setFrom(arr);

      intersect = intersect.filter((v: any) => !values.has(v));
    }

    return intersect;
  });
}

/**
 * ```typescript
 * import { filter } from 'macro-decorators';
 * ```
 *
 * A macro that returns an array filtered by a filter function.
 *
 * ```typescript
 * class Earth {
 *   people = [
 *     {
 *       name: 'Carol Danvers',
 *       isHero: true,
 *     },
 *     {
 *       name: 'Tony Stark',
 *       isHero: true,
 *     },
 *     {
 *       name: 'Otto Octavius',
 *       isVillain: true,
 *     },
 *   ];
 *
 *   @filter('people', p => p.isHero) heroes;
 * }
 *
 * let earth = new Earth();
 * console.log(earth.heroes); // [{ name: 'Carol Danvers', ... }, { name: 'Tony Stark', ... }]
 * ```
 *
 * @param path The path of the array to filter
 * @param fn The callback function to filter the array with
 */
export function filter(
  path: string,
  fn: (value: any, index: number, arr: any[]) => boolean
): PropertyDecorator {
  return macro(obj => getArray(obj, path).filter(fn));
}

/**
 * ```typescript
 * import { filterBy } from 'macro-decorators';
 * ```
 *
 * A macro that returns an array of objects filtered by a property on the
 * objects.
 *
 * ```typescript
 * class Earth {
 *   people = [
 *     {
 *       name: 'Carol Danvers',
 *       isHero: true,
 *     },
 *     {
 *       name: 'Tony Stark',
 *       isHero: true,
 *     },
 *     {
 *       name: 'Otto Octavius',
 *       isHero: false,
 *     },
 *   ];
 *
 *   @filterBy('people', 'isHero') heroes;
 * }
 *
 * let earth = new Earth();
 * console.log(earth.heroes); // [{ name: 'Carol Danvers', ... }, { name: 'Tony Stark', ... }]
 * ```
 *
 * A value can also be passed to compare the property to.
 *
 * ```typescript
 * class Earth {
 *   people = [
 *     {
 *       name: 'Carol Danvers',
 *       isHero: true,
 *     },
 *     {
 *       name: 'Tony Stark',
 *       isHero: true,
 *     },
 *     {
 *       name: 'Otto Octavius',
 *       isHero: false,
 *     },
 *   ];
 *
 *   @filterBy('people', 'isHero', false) villains;
 * }
 *
 * let earth = new Earth();
 * console.log(earth.heroes); // [{ name: 'Otto Octavius', ... }]
 * ```
 *
 * @param path The path of the array of objects to filter
 * @param key The key to filter the objects by
 * @param value A value to compare against when filtering
 */
export function filterBy(path: string, key: string | symbol, value?: any): PropertyDecorator {
  if (value !== undefined) {
    return filter(path, (v: any) => v[key] === value);
  } else {
    return filter(path, (v: any) => Boolean(v[key]));
  }
}

/**
 * ```typescript
 * import { intersect } from 'macro-decorators';
 * ```
 *
 * A macro that returns the intersection of one or more arrays that are passed
 * to it:
 *
 * ```typescript
 * class NumbersBelowTen {
 *   prime = [1, 2, 3, 5, 7];
 *   fib = [1, 1, 2, 3, 5, 8];
 *   odd = [1, 3, 5, 7, 9];
 *
 *   @intersect('prime', 'fib', 'odd') superSpecialNums;
 * }
 *
 * let belowTen = new NumbersBelowTen();
 * console.log(belowTen.superSpecialNums); // [1,3,5]
 * ```
 *
 * @param paths The paths of the arrays to get the intersection of
 */
export function intersect(...paths: string[]): PropertyDecorator {
  return macro(obj => {
    if (paths.length === 0) {
      return [];
    }

    let arrays = getArrays(obj, paths);

    let intersect = arrays.shift() as any[];

    for (let arr of arrays) {
      let values = setFrom(arr);

      intersect = intersect.filter((v: any) => values.has(v));
    }

    return intersect;
  });
}

/**
 * ```typescript
 * import { map } from 'macro-decorators';
 * ```
 *
 * A macro that returns an array mapped by a function.
 *
 * ```typescript
 * class Earth {
 *   people = [
 *     {
 *       name: 'Carol Danvers',
 *     },
 *     {
 *       name: 'Tony Stark',
 *     },
 *     {
 *       name: 'Otto Octavius',
 *     },
 *   ];
 *
 *   @map('people', p => p.name) names;
 * }
 *
 * let earth = new Earth();
 * console.log(earth.names); // ['Carol Danvers', 'Tony Stark', 'Otto Octavius']
 * ```
 *
 * @param path The path of the array to map over
 * @param fn The function to map over the array with
 */
export function map(
  path: string,
  fn: (value: any, i: number, arr: any[]) => any
): PropertyDecorator {
  return macro(obj => getArray(obj, path).map(fn));
}

/**
 * ```typescript
 * import { mapBy } from 'macro-decorators';
 * ```
 *
 * A macro that returns an array of objects mapped by the specified key.
 *
 * ```typescript
 * class Earth {
 *   people = [
 *     {
 *       name: 'Carol Danvers',
 *     },
 *     {
 *       name: 'Tony Stark',
 *     },
 *     {
 *       name: 'Otto Octavius',
 *     },
 *   ];
 *
 *   @mapBy('people', 'name') names;
 * }
 *
 * let earth = new Earth();
 * console.log(earth.names); // ['Carol Danvers', 'Tony Stark', 'Otto Octavius']
 * ```
 *
 * @param path The path of the array of objects to map over
 * @param key The key of the objects to pluck into the new array
 */
export function mapBy(path: string, key: string | symbol): PropertyDecorator {
  return map(path, v => v[key]);
}

/**
 * ```typescript
 * import { max } from 'macro-decorators';
 * ```
 *
 * A macro that returns the maximum value from the specified array.
 *
 * ```typescript
 * class NumbersBelowTen {
 *   prime = [1, 2, 3, 5, 7];
 *   fib = [1, 1, 2, 3, 5, 8];
 *   odd = [1, 3, 5, 7, 9];
 *
 *   @max('prime') biggestPrime;
 * }
 *
 * let belowTen = new NumbersBelowTen();
 * console.log(belowTen.biggestPrime); // 7
 * ```
 *
 * @param path The path to the array to find the max value of
 */
export function max(path: string): PropertyDecorator {
  return macro(obj => Math.max(...getArray(obj, path)));
}

/**
 * ```typescript
 * import { min } from 'macro-decorators';
 * ```
 *
 * A macro that returns the minimum value from the specified array.
 *
 * ```typescript
 * class NumbersBelowTen {
 *   prime = [1, 2, 3, 5, 7];
 *   fib = [1, 1, 2, 3, 5, 8];
 *   odd = [1, 3, 5, 7, 9];
 *
 *   @max('prime') smallestPrime;
 * }
 *
 * let belowTen = new NumbersBelowTen();
 * console.log(belowTen.smallestPrime); // 1
 * ```
 *
 * @param path The path to the array to find the min value of
 */
export function min(path: string): PropertyDecorator {
  return macro(obj => Math.min(...getArray(obj, path)));
}

/**
 * ```typescript
 * import { sort } from 'macro-decorators';
 * ```
 *
 * A macro that returns the specified array sorted by a sort function. The array
 * is duplicated, so the original is not modified in any way.
 *
 * ```typescript
 * class Earth {
 *   people = [
 *     {
 *       name: 'Carol Danvers',
 *     },
 *     {
 *       name: 'Tony Stark',
 *     },
 *     {
 *       name: 'Otto Octavius',
 *     },
 *   ];
 *
 *   @sort('people', (person1, person2) => {
 *     return person1.name > person2.name ? 1 : -1
 *   }) sortedPeople;
 * }
 *
 * let earth = new Earth();
 * console.log(earth.sortedPeople); // [{ name: 'Carol Danvers', ... }, { name: 'Otto Octavius', ... }, { name: 'Tony Stark', ... }]
 * ```
 *
 * @param path The path of the array to sort
 * @param fn The function to sort the array with
 */
export function sort(path: string, fn: (a: any, b: any) => number): PropertyDecorator {
  return macro(obj =>
    getArray(obj, path)
      .slice()
      .sort(fn)
  );
}

/**
 * ```typescript
 * import { sortBy } from 'macro-decorators';
 * ```
 *
 * A macro that returns the specified array of objects sorted by the specified
 * key. Uses standard JavaScript comparisons (`>` and `<` operators) for
 * sorting. Can also specify a direction (ascending or descending).
 *
 * ```typescript
 * class Earth {
 *   people = [
 *     {
 *       name: 'Carol Danvers',
 *     },
 *     {
 *       name: 'Tony Stark',
 *     },
 *     {
 *       name: 'Otto Octavius',
 *     },
 *   ];
 *
 *   @sortBy('people', 'name') sortedPeople;
 * }
 *
 * let earth = new Earth();
 * console.log(earth.sortedPeople); // [{ name: 'Carol Danvers', ... }, { name: 'Otto Octavius', ... }, { name: 'Tony Stark', ... }]
 * ```
 *
 * @param path The path of the array of objects to sort
 * @param key The key of the value to sort the objects by
 * @param asc Whether the sort should be ascending or descinding
 */
export function sortBy(path: string, key: string, asc = true): PropertyDecorator {
  return sort(path, (a, b) => {
    if (a[key] < b[key]) {
      return asc ? -1 : 1;
    } else if (a[key] > b[key]) {
      return asc ? 1 : -1;
    }

    return 0;
  });
}

/**
 * ```typescript
 * import { sum } from 'macro-decorators';
 * ```
 *
 * A macro that returns the sum of the values in the specified array.
 *
 * ```typescript
 * class NumbersBelowTen {
 *   prime = [1, 2, 3, 5, 7];
 *   fib = [1, 1, 2, 3, 5, 8];
 *   odd = [1, 3, 5, 7, 9];
 *
 *   @sum('prime') sumOfThePrimes;
 * }
 *
 * let belowTen = new NumbersBelowTen();
 * console.log(belowTen.sumOfThePrimes); // 18
 * ```
 *
 * @param path The path of the array to sum
 */
export function sum(path: string): PropertyDecorator {
  return macro(obj => getArray(obj, path).reduce((s: number, v: number) => s + v, 0));
}

/**
 * ```typescript
 * import { union } from 'macro-decorators';
 * ```
 *
 * A macro that returns the intersection of one or more arrays that are passed
 * to it:
 *
 * ```typescript
 * class NumbersBelowTen {
 *   prime = [1, 2, 3, 5, 7];
 *   fib = [1, 1, 2, 3, 5, 8];
 *   odd = [1, 3, 5, 7, 9];
 *
 *   @union('prime', 'fib', 'odd') otherSuperSpecialNums;
 * }
 *
 * let belowTen = new NumbersBelowTen();
 * console.log(belowTen.otherSuperSpecialNums); // [1,2,3,5,7,8,9]
 * ```
 *
 * @param paths The paths of the arrays to get the union of
 */
export function union(...paths: string[]): PropertyDecorator {
  return macro(obj => {
    let arrays = getArrays(obj, paths);
    let union = new Set();

    for (let arr of arrays) {
      arr.forEach((v: any) => union.add(v));
    }

    return getValues(union);
  });
}

/**
 * ```typescript
 * import { unique } from 'macro-decorators';
 * ```
 *
 * A macro that returns the unique values in an array.
 *
 * ```typescript
 * class NumbersBelowTen {
 *   prime = [1, 2, 3, 5, 7];
 *   fib = [1, 1, 2, 3, 5, 8];
 *   odd = [1, 3, 5, 7, 9];
 *
 *   @unique('fib') uniqueFib;
 * }
 *
 * let belowTen = new NumbersBelowTen();
 * console.log(belowTen.uniqueFib); // [1,2,3,5,8]
 * ```
 *
 * @param path The path of the array to get all unique values of
 */
export function unique(path: string): PropertyDecorator {
  return union(path);
}

/**
 * ```typescript
 * import { unique } from 'macro-decorators';
 * ```
 * A macro that returns the values in an array of objects that are unique by the
 * specified key.
 *
 * ```typescript
 * class Person {
 *   contacts = [
 *     { name: 'Jessica', phone: '555-1234' }
 *     { name: 'Jake', phone: '555-4321' }
 *     { name: 'Jess', phone: '555-1234' }
 *   ]
 *
 *   @uniqueBy('contacts', 'phone') friends;
 * }
 *
 * let person = new Person();
 * console.log(person.friends); // [{ name: 'Jessica', ... }, { name: 'Jake', ... }]
 * ```
 *
 * @param path The path of the array of objects
 * @param key The key of the value to check for uniqueness
 */
export function uniqueBy(path: string, key: string): PropertyDecorator {
  return macro(obj => {
    let arr = getArray(obj, path);
    let union = new Set();
    let values: any[] = [];

    arr.forEach((v: any) => {
      let keyValue = v[key];

      if (!union.has(keyValue)) {
        union.add(keyValue);
        values.push(v);
      }
    });

    return values;
  });
}

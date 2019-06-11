# Macro Decorators

[![Build Status](https://pzuraq.visualstudio.com/macro-decorators/_apis/build/status/pzuraq.macro-decorators?branchName=master)](https://pzuraq.visualstudio.com/macro-decorators/_build/latest?definitionId=1&branchName=master)
[![Open on Github](https://img.shields.io/badge/-Open%20on%20GitHub-black.svg?logo=github)](https://github.com/pzuraq/macro-decorators)

Sometimes, writing code for JavaScript getters and setters can get repetitive.
Macro decorators allow you to DRY up your code by creating a decorator that can
duplicate a getter/setter's functionality in multiple places!

Checkout [the docs](https://pzuraq.github.io/macro-decorators/) to get
started, or continue reading for more information.

## Installation

Using NPM:

```
npm install macro-decorators
```

Using Yarn:

```
yarn add macro-decorators
```

## Usage

You can import the `macro` decorator from `macro-decorators` and use it to
define macros:

```typescript
import macro from 'macro-decorators';

function fullNameMacro() {
  return macro({
    get() {
      return `${this.firstName} ${this.lastName}`;
    },

    set(obj, key, value) {
      let [firstName, lastName] = value.split(' ');
      this.firstName = firstName;
      this.lastName = lastName;
    },
  });
}

class User {
  firstName;
  lastName;

  @fullNameMacro fullName;
}

class Admin {
  firstName;
  lastName;

  @fullNameMacro fullName;
}

let captainMarvel = new User();

captainMarvel.fullName = 'Carol Danvers';
console.log(captainMarvel.firstName); // 'Carol'
console.log(captainMarvel.lastName); // 'Danvers'
console.log(captainMarvel.fullName); // 'Carol Danvers'
```

You can also create dynamic macros which accept parameters, to make them more
reusable and composable:

```typescript
import macro, { filter, reads } from 'macro-decorators';

function percent(dividendName, divisorName) {
  return macro(function() {
    let divisor = this[divisorName];
    if (!divisor) {
      return null;
    }
    return (this[dividendName] / divisor) * 100;
  });
}

function formattedPercent(percentPropertyName) {
  return macro(function() {
    let value = this[percentPropertyName];
    if (!value) {
      return '--';
    }
    value = value.toFixed(2);
    return `${value}%`;
  });
}

class TestResultComponent {
  testResults = [];

  @filter('testResults', result => !result.finished)
  errorBuilds;

  @filter('testResults', result => result.finished && !result.succeeded))
  failedBuilds;

  @filter('testResults', result => result.finished && result.succeeded))
  passedBuilds;

  @reads('testResults.length') numberOfBuilds;
  @reads('errorBuilds.length') numberOfErrorBuilds;
  @reads('failedBuilds.length') numberOfFailedBuilds;
  @reads('passedBuilds.length') numberOfPassedBuilds;

  @percent('numberOfErrorBuilds', 'numberOfBuilds') percentOfErrorBuilds;
  @percent('numberOfFailedBuilds', 'numberOfBuilds') percentOfFailedBuilds;
  @percent('numberOfPassedBuilds', 'numberOfBuilds') percentOfPassedBuilds;

  @formattedPercent('percentOfErrorBuilds') formattedPercentOfErrorBuilds;
  @formattedPercent('percentOfFailedBuilds') formattedPercentOfFailedBuilds;
  @formattedPercent('percentOfPassedBuilds') formattedPercentOfPassedBuilds;
}
```

The `macro-decorators` library also ships with a number of predefined macros,
including the `@filter` and `@reads` decorators from the last example. Check out
the [API doc](https://pzuraq.github.io/macro-decorators/) for more information
on these macros.

### Macro Paths

Built in macros that receive a key to a different property as an argument can
also receive a _path_ of keys separated by periods:

```typescript
import { reads } from 'macro-decorators';

class Person {
  friends = [];

  @reads('friends.length') numFriends;
}
```

Paths can be any length, but can only consist of string based property keys
separated by periods. They cannot be dynamic.

## Contributing

See the [Contributing](CONTRIBUTING.md) guide for details.

## Compatibility

`macro-decorators` is built using TypeScript, and is compatible with both the
TypeScript and Babel Legacy stage 1 decorators transforms. This is following the
[recommendation](https://github.com/tc39/proposal-decorators#how-should-i-use-decorators-in-transpilers-today)
of the decorators proposal champions.

### Future Upgrade Path

The decorators spec is still changing and not finalized at all, but this library
intends to provide an upgrade path for the `@macro` decorator and all of the
macros defined in it. This plan will be finalized when the decorators proposal
is at least stage 3 and beginning to see wide adoption. Ideally, it will:

1. Be partially codemoddable
2. Not require users to rewrite too much existing code
3. Allow users to import both the legacy decorators and the finalized decorators
   at the same time, in the same app, so users can convert one file at a time.

Whether or not these goals will be technically feasible will depend on the final
spec and its implementation.

## License

This project is licensed under the [MIT License](LICENSE.md).

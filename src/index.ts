import macro from './macro';

export default macro;

function getPath(obj: any, path: string) {
  let segments = path.split('.');
  let current = obj;

  for (let segment of segments) {
    if (current === undefined || current === null) {
      break;
    }

    current = current[segment];
  }

  return current;
}

function getPaths(obj: any, paths: string[]) {
  return paths.map(p => obj[p]);
}

function setPath(obj: any, path: string, value: any) {
  let objPath = path.substr(0, path.lastIndexOf('.'));
  let key = path.substr(path.lastIndexOf('.') + 1);

  let resolvedObj = objPath ? getPath(obj, objPath) : obj;

  resolvedObj[key] = value;
}

// **** Aliasing ****

export function alias(path: string) {
  return macro({
    get(obj) {
      return getPath(obj, path);
    },

    set(obj, _key, value) {
      setPath(obj, path, value);
    },
  });
}

export function deprecatingAlias(path: string, message: string) {
  return macro({
    get(obj, key) {
      console.warn(
        `You got ${obj}#${String(
          key
        )}, but that value has been deprecated: ${message}`
      );
      return getPath(obj, path);
    },

    set(obj, key, value) {
      console.warn(
        `You set ${obj}#${String(
          key
        )}, but that value has been deprecated: ${message}`
      );
      setPath(obj, path, value);
    },
  });
}

export function reads(path: string, defaultValue?: any) {
  return macro(obj => {
    let value = getPath(obj, path);

    if (value === null || value === undefined) {
      value =
        typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    }

    return value;
  });
}

export function overridableReads(path: string) {
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

export function and(...paths: string[]) {
  return macro(obj => getPaths(obj, paths).reduce((a, b) => a && b, true));
}

export function bool(path: string) {
  return macro(obj => Boolean(getPath(obj, path)));
}

export function empty(path: string) {
  return macro(obj => isEmpty(getPath(obj, path)));
}

export function equal(path: string, value: any) {
  return macro(obj => getPath(obj, path) === value);
}

export function gt(path: string, value: any) {
  return macro(obj => getPath(obj, path) > value);
}

export function gte(path: string, value: any) {
  return macro(obj => getPath(obj, path) >= value);
}

export function not(path: string) {
  return macro(obj => !getPath(obj, path));
}

export function notEmpty(path: string) {
  return macro(obj => !isEmpty(getPath(obj, path)));
}

export function match(path: string, regex: RegExp) {
  return macro(obj => regex.test(getPath(obj, path)));
}

export function nullish(path: string) {
  return macro(obj => {
    let value = getPath(obj, path);

    return value === null || value === undefined;
  });
}

export function or(...paths: string[]) {
  return macro(obj => getPaths(obj, paths).reduce((a, b) => a || b, false));
}

export function lt(path: string, value: any) {
  return macro(obj => getPath(obj, path) < value);
}

export function lte(path: string, value: any) {
  return macro(obj => getPath(obj, path) <= value);
}

// **** Arrays ****
function setFrom(arr: any[]) {
  let set = new Set();

  arr.forEach(v => set.add(v));

  return set;
}

function getValues(set: Set<any>) {
  if (set.values) {
    return Array.from(set);
  }

  let values: any[] = [];

  set.forEach(v => values.push(v));

  return values;
}

export function collect(...paths: string[]) {
  return macro(obj => getPaths(obj, paths));
}

export function diff(...paths: string[]) {
  return macro(obj => {
    let arrays = getPaths(obj, paths);

    let intersect = arrays.shift();

    for (let arr of arrays) {
      let values = setFrom(arr);

      intersect = intersect.filter((v: any) => !values.has(v));
    }

    return intersect;
  });
}

export function filter(
  path: string,
  fn: (value: any, i: number, arr: any[]) => boolean
) {
  return macro(obj => getPath(obj, path).filter(fn));
}

export function filterBy(path: string, key: string | symbol, value?: any) {
  if (value !== undefined) {
    return filter(path, (v: any) => v[key] === value);
  } else {
    return filter(path, (v: any) => Boolean(v[key]));
  }
}

export function intersect(...paths: string[]) {
  return macro(obj => {
    let arrays = getPaths(obj, paths);

    let intersect = arrays.shift();

    for (let arr of arrays) {
      let values = setFrom(arr);

      intersect = intersect.filter((v: any) => values.has(v));
    }

    return intersect;
  });
}

export function map(
  path: string,
  fn: (value: any, i: number, arr: any[]) => any
) {
  return macro(obj => getPath(obj, path).map(fn));
}

export function mapBy(path: string, key: string | symbol) {
  return map(path, v => v[key]);
}

export function max(path: string) {
  return macro(obj => Math.max(...getPath(obj, path)));
}

export function min(path: string) {
  return macro(obj => Math.min(...getPath(obj, path)));
}

export function sort(path: string, sortFn: (a: any, b: any) => number) {
  return macro(obj => getPath(obj, path).sort(sortFn));
}

export function sortBy(path: string, key: string, asc = true) {
  return sort(path, (a, b) => {
    if (a[key] < b[key]) {
      return asc ? -1 : 1;
    } else if (a[key] > b[key]) {
      return asc ? 1 : -1;
    }

    return 0;
  });
}

export function sum(path: string) {
  return macro(obj =>
    getPath(obj, path).reduce((s: number, v: number) => s + v, 0)
  );
}

export function union(...paths: string[]) {
  return macro(obj => {
    let arrays = getPaths(obj, paths);
    let union = new Set();

    for (let arr of arrays) {
      arr.forEach((v: any) => union.add(v));
    }

    return getValues(union);
  });
}

export function unique(path: string) {
  return union(path);
}

export function uniqueBy(path: string, key: string) {
  return macro(obj => {
    let arr = getPath(obj, path);
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

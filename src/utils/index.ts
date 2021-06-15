export function getPath(obj: any, path: string) {
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

export function getPaths(obj: any, paths: string[]) {
  return paths.map(p => getPath(obj, p));
}

export function setPath(obj: any, path: string, value: any) {
  let objPath = path.substr(0, path.lastIndexOf('.'));
  let key = path.substr(path.lastIndexOf('.') + 1);

  let resolvedObj = objPath ? getPath(obj, objPath) : obj;

  if (typeof resolvedObj.set === 'function') {
    resolvedObj.set(key, value);
  } else {
    resolvedObj[key] = value;
  }
}

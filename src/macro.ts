export default function macro(
  def:
    | ((obj: any) => any)
    | {
        get?: (obj: any, key: string | symbol) => any;
        set?: (obj: any, key: string | symbol, value: any) => void;
      }
): PropertyDecorator {
  let getter: ((obj: any, key: string | symbol) => any) | undefined;
  let setter:
    | ((obj: any, key: string | symbol, value: any) => void)
    | undefined;

  if (typeof def === 'function') {
    getter = def;
  } else {
    getter = def.get;
    setter = def.set;
  }

  return function(_target, key) {
    let desc: PropertyDescriptor = {};

    if (getter !== undefined) {
      desc.get = function() {
        return getter!(this, key);
      };
    }

    if (setter !== undefined) {
      desc.set = function(value) {
        return setter!(this, key, value);
      };
    }

    return desc;
  };
}

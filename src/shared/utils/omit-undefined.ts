type WithoutUndefined<T> = { [K in keyof T]?: Exclude<T[K], undefined> }

export const omitUndefined = <T extends object>(obj: T): WithoutUndefined<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as WithoutUndefined<T>
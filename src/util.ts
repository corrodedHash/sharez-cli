import { InvalidArgumentError } from "commander";
export function myParseInt(value: string, dummyPrevious: any) {
  // parseInt takes a string and a radix
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError("Not a number.");
  }
  return parsedValue;
}

export function partition<T>(
  arr: T[],
  fn: (element: T) => boolean
): { trueElements: T[]; falseElements: T[] } {
  const result = arr.reduce(
    (acc, val) => {
      acc[fn(val) ? "trueElements" : "falseElements"].push(val);
      return acc;
    },
    { trueElements: [] as T[], falseElements: [] as T[] }
  );
  return result;
}

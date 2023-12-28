/**
 * Find the first smallest missing integer from an array.
 */
export function findFirstSmallestInArray(numbers: number[]) {
  const numberSet = new Set(numbers.filter(num => num > 0));
  let int = 1;
  while (numberSet.has(int)) {
    int++;
  }
  return int;
}

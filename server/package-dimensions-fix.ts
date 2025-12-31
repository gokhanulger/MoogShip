// Function to convert package dimensions to numbers
export function convertPackageDimensionsToNumbers(packageData: any) {
  // Convert each dimension property to a number if it's a string
  return {
    ...packageData,
    weight: typeof packageData.weight === 'string' ? Number(packageData.weight) : packageData.weight,
    length: typeof packageData.length === 'string' ? Number(packageData.length) : packageData.length,
    width: typeof packageData.width === 'string' ? Number(packageData.width) : packageData.width,
    height: typeof packageData.height === 'string' ? Number(packageData.height) : packageData.height,
  };
}
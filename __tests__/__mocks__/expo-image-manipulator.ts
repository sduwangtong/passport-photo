// Stub so util files that import expo-image-manipulator don't blow up in node tests.
export const SaveFormat = { JPEG: 'jpeg', PNG: 'png' };
export async function manipulateAsync(uri: string) {
  return { uri };
}

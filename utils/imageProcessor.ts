import * as ImageManipulator from 'expo-image-manipulator';

const DPI = 300;

export async function cropToAspectRatio(
  uri: string,
  targetWidth: number,
  targetHeight: number,
  originalWidth: number,
  originalHeight: number,
): Promise<string> {
  const targetAspect = targetWidth / targetHeight;
  const originalAspect = originalWidth / originalHeight;

  let cropX = 0;
  let cropY = 0;
  let cropWidth = originalWidth;
  let cropHeight = originalHeight;

  if (originalAspect > targetAspect) {
    // Original is wider — crop sides
    cropWidth = Math.round(originalHeight * targetAspect);
    cropX = Math.round((originalWidth - cropWidth) / 2);
  } else {
    // Original is taller — crop top/bottom
    cropHeight = Math.round(originalWidth / targetAspect);
    cropY = Math.round((originalHeight - cropHeight) / 2);
  }

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        crop: {
          originX: cropX,
          originY: cropY,
          width: cropWidth,
          height: cropHeight,
        },
      },
    ],
    { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG },
  );

  return result.uri;
}

export async function resizeToExactDimensions(
  uri: string,
  widthInch: number,
  heightInch: number,
): Promise<string> {
  const pixelWidth = Math.round(widthInch * DPI);
  const pixelHeight = Math.round(heightInch * DPI);

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: pixelWidth, height: pixelHeight } }],
    { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG },
  );

  return result.uri;
}

export async function toBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function processPhoto(
  uri: string,
  templateWidthInch: number,
  templateHeightInch: number,
  originalWidth: number,
  originalHeight: number,
): Promise<string> {
  const cropped = await cropToAspectRatio(
    uri,
    templateWidthInch,
    templateHeightInch,
    originalWidth,
    originalHeight,
  );
  const resized = await resizeToExactDimensions(cropped, templateWidthInch, templateHeightInch);
  return toBase64(resized);
}

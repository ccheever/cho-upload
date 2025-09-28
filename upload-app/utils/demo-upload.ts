const DEMO_UPLOAD_URL = 'http://100.72.251.34:3400/upload';

export type UploadableAsset = {
  uri: string;
  name: string;
  type?: string | null;
  file?: File | null;
};

type UploadOptions = {
  fieldName?: string;
  extraFields?: Record<string, string>;
};

/**
 * Sends the asset to a demo endpoint using multipart/form-data.
 * Replace DEMO_UPLOAD_URL with your backend when wiring this up for real uploads.
 */
export async function uploadAsset(asset: UploadableAsset, options: UploadOptions = {}) {
  const { fieldName = 'file', extraFields } = options;
  const formData = new FormData();

  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) {
      formData.append(key, value);
    }
  }

  const filePart = await createFormDataValue(asset);

  if (isWebFile(filePart)) {
    formData.append(fieldName, filePart, asset.name);
  } else {
    formData.append(fieldName, filePart as any);
  }

  const response = await fetch(DEMO_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await readBodySafely(response);
    throw new Error(
      errorBody ? `Upload failed (${response.status}): ${errorBody}` : `Upload failed with status ${response.status}`,
    );
  }
}

export { DEMO_UPLOAD_URL };

async function readBodySafely(response: Response) {
  try {
    return await response.text();
  } catch (error) {
    console.warn('Unable to read response body', error);
    return '';
  }
}

async function createFormDataValue(asset: UploadableAsset) {
  if (isWeb()) {
    if (asset.file && isWebFile(asset.file)) {
      return asset.file;
    }

    const response = await fetch(asset.uri);
    const blob = await response.blob();
    return new File([blob], asset.name, {
      type: asset.type ?? blob.type ?? 'application/octet-stream',
    });
  }

  return {
    uri: asset.uri,
    name: asset.name,
    type: asset.type ?? 'application/octet-stream',
  };
}

function isWeb() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isWebFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

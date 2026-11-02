// Pick a photo or document for upload (ATTACH-01, CREATE-07). Libraries per CLAUDE.md:
// react-native-image-picker (camera, gallery) and @react-native-documents/picker (files).
import { Alert } from 'react-native';
import { launchCamera, launchImageLibrary, type ImagePickerResponse } from 'react-native-image-picker';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import type { PickedFile } from '../../domain/attachment-policy';

export type PickSource = 'camera' | 'gallery' | 'document';

function fromImage(res: ImagePickerResponse): PickedFile | null {
  const a = res.assets?.[0];
  if (res.didCancel || !a?.uri) return null;
  return { uri: a.uri, name: a.fileName ?? 'photo.jpg', type: a.type ?? 'image/jpeg', size: a.fileSize ?? null };
}

export async function pickFrom(source: PickSource): Promise<PickedFile | null> {
  if (source === 'camera') return fromImage(await launchCamera({ mediaType: 'photo', quality: 0.7, saveToPhotos: false }));
  if (source === 'gallery') return fromImage(await launchImageLibrary({ mediaType: 'photo', quality: 0.7, selectionLimit: 1 }));
  try {
    const [doc] = await pick({ type: [types.pdf, types.images] });
    return { uri: doc.uri, name: doc.name ?? 'document', type: doc.type ?? 'application/octet-stream', size: doc.size ?? null };
  } catch (err) {
    if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return null;
    throw err;
  }
}

/** Asks where the file comes from, then opens that picker. Resolves null if the user cancels. */
export function chooseAndPick(): Promise<{ file: PickedFile; source: PickSource } | null> {
  return new Promise(resolve => {
    const go = (source: PickSource) => () =>
      pickFrom(source)
        .then(file => resolve(file ? { file, source } : null))
        .catch(() => resolve(null));
    Alert.alert('Add a file', 'PDF, JPG or PNG', [
      { text: 'Camera', onPress: go('camera') },
      { text: 'Photos', onPress: go('gallery') },
      { text: 'Files', onPress: go('document') },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
}

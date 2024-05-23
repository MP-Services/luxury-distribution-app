import {deleteLogs} from '@functions/repositories/logRepository';

/**
 *
 * @returns {Promise<void>}
 */
export default async function deleteLogsData() {
  try {
    await deleteLogs();
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

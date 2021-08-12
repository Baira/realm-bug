/* eslint-disable import/no-mutable-exports */
import Realm from 'realm';
import RNFS from 'react-native-fs';
import config from './config';
import {BackHandler} from 'react-native';
import {cartesSchema} from './schemas';

const {realmPath, appConfig, LOG_TO_FILE, TRACE_LOG, schemaName} = config;

export const app = new Realm.App(appConfig);

export let realm;

function errorSync(session, error) {
  console.log('realm', realm);
  if (realm !== undefined) {
    console.log('error.name', error.name);
    if (error.name === 'ClientReset') {
      const oldRealmPath = realm.path;

      realm.close();

      console.log(`Error ${error.message}, need to reset ${oldRealmPath}…`);
      Realm.App.Sync.initiateClientReset(app, oldRealmPath);
      console.log(`Creating backup from ${error.config.path}…`);

      // Move backup file to a known location for a restore
      // (it's async, but we don't care much to wait at this point)
      RNFS.moveFile(error.config.path, `${oldRealmPath}~`).finally(() => {
        // realm = null;
        BackHandler.exitApp();
      });
    } else {
      console.log(`Received realm error ${error.message}`);
    }
  }
}

async function restoreRealm() {
  if (!realm) {
    return;
  }

  const backupPath = `${realm.path}~`;

  console.log('backupPath', backupPath);

  const backupExists = await RNFS.exists(backupPath);

  console.log('backupExists', backupExists);

  if (backupExists) {
    const backupRealm = await Realm.open({path: backupPath, readOnly: true});

    const backupObjects = backupRealm
      .objects(schemaName)
      .filtered('updatedAt != null AND synced = null');

    console.log(
      `Found ${backupObjects.length} ${schemaName} objects in ${backupPath}, proceeding to merge…`,
    );

    if (backupObjects.length > 0) {
      realm.beginTransaction();
      backupObjects.forEach(element => {
        realm.create(schemaName, element, 'modified');
      });
      realm.commitTransaction();
    }

    const rand = String(Math.floor(100000 + Math.random() * 900000));

    await RNFS.moveFile(backupPath, `${backupPath}~~${rand}`);

    console.log(`Merge completed, deleting ${backupPath}…`);

    await RNFS.unlink(backupPath);
  }
}

async function openRealm(user, phone) {
  if (Realm.App && Realm.App.Sync) {
    console.log('LOGGING REALM');
    if (LOG_TO_FILE) {
      Realm.App.Sync.setLogger(app, (level, message) =>
        console.log(`(${level}) ${message}`),
      );
    }
    if (TRACE_LOG) {
      Realm.App.Sync.setLogLevel(app, 'trace');
    } else {
      Realm.App.Sync.setLogLevel(app, 'off');
    }
  }
  console.log('user.id', user.id);
  console.log('phone openRealm', phone);
  const path = `${realmPath}-${phone}`;

  const realmConfig = {
    schema: [cartesSchema],
    schemaVersion: 1,
    path,
    sync: {
      user,
      partitionValue: phone,
      newRealmFileBehavior: {
        type: 'openImmediately',
        timeOutBehavior: 'throwException',
        timeout: 5000,
      },
      existingRealmFileBehavior: {
        type: 'openImmediately',
        timeOutBehavior: 'openLocalRealm',
        timeout: 5000,
      },
      downloadBeforeOpenBehavior: {
        type: 'openImmediately',
        timeOutBehavior: 'openLocalRealm',
        timeout: 5000,
      },
      timeout: 5000,
      error: errorSync,
    },
    timeout: 5000,
  };

  realm = await Realm.open(realmConfig);

  console.log('Opened realm successfully');

  // If a backup file exists, restore to the current realm, and delete file afterwards
  await restoreRealm();
}

export default openRealm;

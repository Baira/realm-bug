import RNFS from 'react-native-fs';

const isDevEnv = __DEV__;

export default {
  appName: 'TAAZOUR CNAM',
  isDevEnv,
  realmPath: `${RNFS.CachesDirectoryPath}/realms/realm`,
  // realmApiKey: 'RONJeggHQPHroxwfnke9b3HiQmp2FX7Tywai6us1kw7Tj4iXW4wqCZQVd1FQ9qOj',
  appConfig: {
    id: 'cnam-hcing',
    timeout: 15000,
  },
  LOG_TO_FILE: isDevEnv,
  TRACE_LOG: isDevEnv,
  schemaName: 'cnam',
  version: 'v2.2.0',
};

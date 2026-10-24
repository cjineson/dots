import { registerRootComponent } from 'expo';

import { initSqliteShim } from './src/web/sqliteShim';

initSqliteShim().then(() => {
  const App = require('./App').default;
  registerRootComponent(App);
});

import { registerRootComponent } from 'expo';
import App from './App';

if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
  console.debug = () => {};
}

registerRootComponent(App);

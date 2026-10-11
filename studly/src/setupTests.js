import '@testing-library/jest-dom';

// react-router 7 нужен TextEncoder, в jsdom его нет
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}
window.scrollTo = () => {};

// Тест локального запуска с keep-alive
import { startKeepAlive } from './dist/keepAlive.js';

// Установим тестовый URL для локального тестирования
process.env.APP_URL = 'http://localhost:10000';
process.env.PORT = '10000';

console.log('Testing keep-alive service locally...');
console.log('APP_URL:', process.env.APP_URL);
console.log('PORT:', process.env.PORT);

const service = startKeepAlive();

// Запустим тест на 1 минуту
console.log('Test will run for 1 minute...');
setTimeout(() => {
  console.log('Stopping test...');
  service.stop();
  console.log('Test completed successfully!');
  process.exit(0);
}, 60000);
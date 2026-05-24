// Тестовый скрипт для проверки keep-alive
import { startKeepAlive } from './dist/keepAlive.js';

console.log('Starting keep-alive test...');
const service = startKeepAlive();

// Остановим через 30 секунд для теста
setTimeout(() => {
  console.log('Stopping keep-alive test...');
  service.stop();
  process.exit(0);
}, 30000);
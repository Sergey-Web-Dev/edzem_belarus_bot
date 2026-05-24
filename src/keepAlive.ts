import { createServer } from "node:http";
import https from "node:https";

const healthCheckPort = Number(process.env.PORT ?? 10000);
const appUrl = process.env.APP_URL || "https://edzem-belarus-bot.onrender.com";
const pingInterval = 14 * 60 * 1000; // 14 минут (меньше 15 минут сна)

// Функция для пинга приложения
const pingApp = async () => {
  try {
    console.log(`Pinging ${appUrl} at ${new Date().toISOString()}`);
    
    // Используем динамический импорт для node-fetch
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(appUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Keep-Alive-Ping'
      }
    });
    
    if (response.ok) {
      console.log(`Ping successful: ${response.status}`);
    } else {
      console.log(`Ping failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Ping error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Запускаем периодический пинг
let pingTimer: NodeJS.Timeout | null = null;

const startKeepAlive = () => {
  console.log(`Starting keep-alive service. Will ping every ${pingInterval / 60000} minutes.`);
  
  // Первый пинг сразу
  pingApp();
  
  // Затем по расписанию
  pingTimer = setInterval(pingApp, pingInterval);
  
  return {
    stop: () => {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
        console.log("Keep-alive service stopped");
      }
    }
  };
};

// Health check сервер
const createHealthServer = () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'keep-alive'
    }));
  });

  server.listen(healthCheckPort, "0.0.0.0", () => {
    console.log(`Keep-alive health check listening on port ${healthCheckPort}`);
  });

  return server;
};

export { startKeepAlive, createHealthServer, pingApp };
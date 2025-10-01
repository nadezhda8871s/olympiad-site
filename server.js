const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.json());

// Используем /tmp для записи на Render
const DATA_DIR = process.env.RENDER ? '/tmp/data' : path.join(__dirname, 'data');
fs.ensureDirSync(DATA_DIR);

const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const TEMPLATES_DIR = path.join(__dirname, 'templates');

// ... остальной код без изменений ...

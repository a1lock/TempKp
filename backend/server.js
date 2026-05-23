const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const contractRoutes = require('./routes/contractRoutes');

const app = express();

// базовые middleware
app.use(cors());
app.use(express.json()); // парсинг json в теле запроса

// подключение маршрутов
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/contracts', contractRoutes);

// обработка несуществующих маршрутов
app.use((req, res) => {
    res.status(404).json({ error: 'маршрут не найден' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`сервер запущен на порту ${PORT}`);
});
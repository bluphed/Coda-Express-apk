const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

app.post('/expandir', async (req, res) => {
    try {
        const { link } = req.body;

        const response = await fetch(link, {
            method: 'GET',
            redirect: 'follow'
        });

        const finalUrl = response.url;

        let match = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

        if (!match) {
            match = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        }

        if (match) {
            return res.json({
                lat: parseFloat(match[1]),
                lng: parseFloat(match[2])
            });
        }

        res.json({ error: 'No coords' });

    } catch (err) {
        res.status(500).json({ error: 'Error' });
    }
});

app.listen(10000, () => {
    console.log('Servidor corriendo');
});
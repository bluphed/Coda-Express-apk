const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

app.use(express.json());

// 🔥 Endpoint para procesar link
app.post('/expandir', async (req, res) => {
    const { link } = req.body;

    if (!link) {
        return res.json({ error: 'No hay link' });
    }

    try {
        // Seguir redirección
        const response = await fetch(link, {
            method: 'GET',
            redirect: 'follow'
        });

        const finalUrl = response.url;

        // Buscar coordenadas
        let match = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

        if (!match) {
            match = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        }

        if (!match) {
            match = finalUrl.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        }

        if (match) {
            return res.json({
                lat: parseFloat(match[1]),
                lng: parseFloat(match[2])
            });
        }

        return res.json({ error: 'No se encontraron coordenadas' });

    } catch (error) {
        res.json({ error: 'Error al procesar link' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
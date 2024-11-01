const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Ruta para guardar un nuevo rostro en el archivo JSON
app.post('/save-face', (req, res) => {
    const newFace = req.body;  // Aquí debería contener tanto "label" como "descriptors"

    // Ruta al archivo JSON
    const filePath = path.join(__dirname, 'faces.json');

    // Leer el archivo existente o crear uno nuevo
    fs.readFile(filePath, 'utf8', (err, data) => {
        let faces = [];
        if (!err && data) {
            faces = JSON.parse(data);
        }

        faces.push(newFace);  // Agregar el nuevo rostro al array

        // Guardar la lista actualizada en el archivo
        fs.writeFile(filePath, JSON.stringify(faces, null, 2), (err) => {
            if (err) {
                console.error("Error al guardar el rostro:", err);
                return res.status(500).send('Error al guardar el rostro');
            }
            console.log("Rostro guardado correctamente:", newFace);
            res.send('Rostro guardado correctamente');
        });
    });
});

// Ruta para cargar todos los rostros guardados desde el archivo JSON
app.get('/load-faces', (req, res) => {
    const filePath = path.join(__dirname, 'faces.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error al cargar rostros:", err);
            return res.status(500).send('Error al cargar rostros');
        }
        
        const faces = JSON.parse(data || '[]');
        res.json(faces);
    });
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

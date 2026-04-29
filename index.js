const express = require("express");
const AWS = require("aws-sdk");
const multer = require("multer");
const crypto = require("crypto"); // Para generar el UUID y sessionString
const { sequelize, Alumno, Profesor } = require("./database");
const app = express();

app.use(express.json());
const PORT = 80;
const upload = multer({ storage: multer.memoryStorage() });

AWS.config.update({
  accessKeyId: "ASIAR34N4Q445CRQJIQG",
  secretAccessKey: "0fNVRfhRIUzouDY/o73zWiF/LLrRuUHli16sFgfb",
  sessionToken: "IQoJb3JpZ2luX2VjECMaCXVzLWdlc3QtMiJIMEYCIQDzHnm4gAm30Sz/smRcikK19hgZIzpodc+c+1UddFH0rAIhAK0R5xGu5/BroBgt+yQvMfWcqzNwzXwOvWhkc5MqK+e/KsECCOz//////////wEQABoMMTI4NjA5NzE2MDI1IgxwWqm+zTFaS3s4xCEqlQL4KSmRevOZeVwzUZ/t3ovuKFqLUJMsL4JfDRyOT3vea/aHpoOqvOe+Z/bNlRSzr9nFETJzFZpWY75b0q9ASYp4+REyZEAj2uXioZQwxzeRXPOo0ZOkL6+dNwNTXly6EIP3rqVPauyDp7vwPwzPXfzaalxVh+4PKoNm2a6hKa+/VEHSlBu9DNqzRA/RRYuB9XEzl+t/8c0qaRr0lSP5tUI2rQm9WoqAGiAeeW2ho0FmBBHeV52fDqTuF6M+isNvHJTRFMDxHIRYkqxQdhxzYT4o72TnA+ho6pFrYz+KnaFOkGiSKna3sbI8bNO3i3HlvHyzlmM6e/X74/QddltPk9WIHhz4224pYXs7jkx4PAnU/DBsoVbPMPjvxc8GOpwBo0ksHpjkl4J/9D8by4GO/uJPGInqcmJMYhJi1PMPzO4RR3fdwALg7KxJBjufoJWcPxG750jG7xqA5k5F9aihxHbRKCshDsMh2tDj94veya62RgJL2S/qKroWhm2bF7uaDrXnTHI77HyzXUDK31gB28OdyskjLB52GSJnQnIFTY/W+PRekC9MLiSyGt0lkLKDvwCX4MufUHrymQrh",
  region: "us-east-1"
});

const s3 = new AWS.S3();
const sns = new AWS.SNS();
const dynamo = new AWS.DynamoDB.DocumentClient(); 

sequelize.sync()
  .then(() => console.log("Conectado a RDS exitosamente"))
  .catch(err => console.log("Error de conexión RDS:", err));

/* =========================
   ENDPOINTS ALUMNOS (RDS)
========================= */
app.get("/alumnos", async (req, res) => {
  const lista = await Alumno.findAll();[cite: 1]
  res.status(200).json(lista);
});

app.get("/alumnos/:id", async (req, res) => {
  const alumno = await Alumno.findByPk(req.params.id);[cite: 1]
  if (!alumno) return res.status(404).json({ error: "Alumno no encontrado" });
  res.status(200).json(alumno);
});

app.post("/alumnos", async (req, res) => {
  const nuevo = await Alumno.create(req.body);[cite: 1]
  res.status(201).json(nuevo);
});

/* ==========================================
   S3 y SNS
   ========================================== */
app.post("/alumnos/:id/fotoPerfil", upload.single('foto'), async (req, res) => {
  try {
    const alumno = await Alumno.findByPk(req.params.id);[cite: 1]
    const params = {
      Bucket: "uady-varguez-fotos-2026", 
      Key: `foto-${req.params.id}-${Date.now()}`, 
      Body: req.file.buffer,
      ACL: 'public-read',
      ContentType: req.file.mimetype
    };
    const uploadResult = await s3.upload(params).promise();[cite: 1]
    await alumno.update({ fotoPerfilUrl: uploadResult.Location });[cite: 1]
    res.status(200).json({ mensaje: "Foto subida", url: uploadResult.Location });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/alumnos/:id/email", async (req, res) => {
  try {
    const alumno = await Alumno.findByPk(req.params.id);[cite: 1]
    const mensaje = `Calificaciones de ${alumno.nombres} ${alumno.apellidos}: ${alumno.promedio}`;
    await sns.publish({ Message: mensaje, TopicArn: "arn:aws:sns:us-east-1:128609716025:topic-api" }).promise();[cite: 1]
    res.status(200).json({ mensaje: "Notificación enviada" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ==========================================
   (DYNAMODB)
   ========================================== */

// LOGIN: Crea la sesión
app.post("/alumnos/:id/session/login", async (req, res) => {
  try {
    const alumno = await Alumno.findByPk(req.params.id);[cite: 1]
    if (!alumno || alumno.password !== req.body.password) {
      return res.status(400).json({ error: "Credenciales incorrectas" });[cite: 1]
    }

    const sessionItem = {
      id: crypto.randomUUID(), // UUID string[cite: 1]
      fecha: Math.floor(Date.now() / 1000), // Unix timestamp[cite: 1]
      alumnoId: parseInt(req.params.id),
      active: true, // true por defecto[cite: 1]
      sessionString: crypto.randomBytes(64).toString('hex') // 128 dígitos[cite: 1]
    };

    await dynamo.put({ TableName: "sesiones-alumnos", Item: sessionItem }).promise();[cite: 1]
    res.status(200).json(sessionItem);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// VERIFY: Comprueba si la sesión es válida[cite: 1]
app.post("/alumnos/:id/session/verify", async (req, res) => {
  const { sessionString } = req.body;
  try {
    const result = await dynamo.scan({
      TableName: "sesiones-alumnos",
      FilterExpression: "sessionString = :ss AND active = :act",
      ExpressionAttributeValues: { ":ss": sessionString, ":act": true }
    }).promise();[cite: 1]

    if (result.Items.length > 0) {
      res.status(200).json({ mensaje: "Sesión válida" });[cite: 1]
    } else {
      res.status(400).json({ error: "Sesión inválida o expirada" });[cite: 1]
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// LOGOUT: Pone active en false[cite: 1]
app.post("/alumnos/:id/session/logout", async (req, res) => {
  const { sessionString } = req.body;
  try {
    const result = await dynamo.scan({
      TableName: "sesiones-alumnos",
      FilterExpression: "sessionString = :ss",
      ExpressionAttributeValues: { ":ss": sessionString }
    }).promise();[cite: 1]

    if (result.Items.length > 0) {
      const sessionId = result.Items[0].id;
      await dynamo.update({
        TableName: "sesiones-alumnos",
        Key: { id: sessionId },
        UpdateExpression: "set active = :act",
        ExpressionAttributeValues: { ":act": false }
      }).promise();[cite: 1]
      res.status(200).json({ mensaje: "Sesión cerrada" });[cite: 1]
    } else {
      res.status(404).json({ error: "Sesión no encontrada" });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* =========================
   SERVIDOR
========================= */
app.use((req, res) => { res.status(404).json({ error: "Ruta no encontrada" }); });
app.listen(PORT, () => { console.log(`Servidor Completo Fase 8 corriendo en puerto ${PORT}`); });
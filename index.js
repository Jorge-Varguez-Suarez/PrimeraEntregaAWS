const express = require("express");
const AWS = require("aws-sdk");
const multer = require("multer");
const crypto = require("crypto");
const { sequelize, Alumno, Profesor } = require("./database");
const app = express();

app.use(express.json());
const PORT = 80;
const upload = multer({ storage: multer.memoryStorage() });

// Configuración de AWS: ¡Actualiza estas claves antes de correr el servidor!
AWS.config.update({
  accessKeyId: "PEGAR_NUEVA_ACCESS_KEY_AQUI",
  secretAccessKey: "PEGAR_NUEVA_SECRET_KEY_AQUI",
  sessionToken: "PEGAR_NUEVO_TOKEN_AQUI",
  region: "us-east-1",
});

const s3 = new AWS.S3();
const sns = new AWS.SNS();
const dynamo = new AWS.DynamoDB.DocumentClient();

sequelize.sync().then(() => console.log("Base de datos sincronizada."));

// Manejador central para enviar mensajes de error claros cuando los datos son inválidos
const manejarErroresDeValidacion = (err, res) => {
  if (
    err.name === "SequelizeValidationError" ||
    err.name === "SequelizeUniqueConstraintError"
  ) {
    return res
      .status(400)
      .json({ error: "La información proporcionada no es correcta." });
  }
  return res.status(500).json({ error: err.message });
};

// Respuestas para métodos no permitidos (Soluciona el error 405)
const noPermitido = (req, res) =>
  res.status(405).json({ error: "Acción no permitida." });
app.put("/alumnos", noPermitido);
app.delete("/alumnos", noPermitido);
app.put("/profesores", noPermitido);
app.delete("/profesores", noPermitido);

/* ==========================================
   ALUMNOS
========================================== */
app.get("/alumnos", async (req, res) => {
  res.status(200).json(await Alumno.findAll());
});

app.get("/alumnos/:id", async (req, res) => {
  const alumno = await Alumno.findByPk(req.params.id);
  if (!alumno) return res.status(404).json({ error: "El alumno no existe." });
  res.status(200).json(alumno);
});

app.post("/alumnos", async (req, res) => {
  try {
    const nuevoAlumno = await Alumno.create(req.body);
    res.status(201).json(nuevoAlumno);
  } catch (err) {
    manejarErroresDeValidacion(err, res);
  }
});

app.put("/alumnos/:id", async (req, res) => {
  try {
    const alumno = await Alumno.findByPk(req.params.id);
    if (!alumno) return res.status(404).json({ error: "El alumno no existe." });
    await alumno.update(req.body);
    res.status(200).json(alumno);
  } catch (err) {
    manejarErroresDeValidacion(err, res);
  }
});

app.delete("/alumnos/:id", async (req, res) => {
  const alumno = await Alumno.findByPk(req.params.id);
  if (!alumno) return res.status(404).json({ error: "El alumno no existe." });
  await alumno.destroy();
  res.status(200).json({ mensaje: "Alumno borrado exitosamente." });
});

/* ==========================================
   PROFESORES
========================================== */
app.get("/profesores", async (req, res) => {
  res.status(200).json(await Profesor.findAll());
});

app.get("/profesores/:id", async (req, res) => {
  const profesor = await Profesor.findByPk(req.params.id);
  if (!profesor)
    return res.status(404).json({ error: "El profesor no existe." });
  res.status(200).json(profesor);
});

app.post("/profesores", async (req, res) => {
  try {
    const nuevoProfesor = await Profesor.create(req.body);
    res.status(201).json(nuevoProfesor);
  } catch (err) {
    manejarErroresDeValidacion(err, res);
  }
});

app.put("/profesores/:id", async (req, res) => {
  try {
    const profesor = await Profesor.findByPk(req.params.id);
    if (!profesor)
      return res.status(404).json({ error: "El profesor no existe." });
    await profesor.update(req.body);
    res.status(200).json(profesor);
  } catch (err) {
    manejarErroresDeValidacion(err, res);
  }
});

app.delete("/profesores/:id", async (req, res) => {
  const profesor = await Profesor.findByPk(req.params.id);
  if (!profesor)
    return res.status(404).json({ error: "El profesor no existe." });
  await profesor.destroy();
  res.status(200).json({ mensaje: "Profesor borrado exitosamente." });
});

/* ==========================================
   S3 (Fotos de Perfil) y SNS (Correos)
========================================== */
app.post("/alumnos/:id/fotoPerfil", upload.single("foto"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "Es necesario adjuntar una foto." });
    const alumno = await Alumno.findByPk(req.params.id);
    if (!alumno) return res.status(404).json({ error: "El alumno no existe." });

    const params = {
      Bucket: "uady-varguez-fotos-2026",
      Key: `foto-${alumno.id}-${Date.now()}.jpg`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: "public-read",
    };

    const resultado = await s3.upload(params).promise();
    await alumno.update({ fotoPerfilUrl: resultado.Location });
    res.status(200).json({ fotoPerfilUrl: resultado.Location });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/alumnos/:id/email", async (req, res) => {
  try {
    const alumno = await Alumno.findByPk(req.params.id);
    if (!alumno) return res.status(404).json({ error: "El alumno no existe." });

    const mensaje = `Calificaciones de ${alumno.nombres} ${alumno.apellidos}: ${alumno.promedio}`;
    await sns
      .publish({
        Message: mensaje,
        TopicArn: "arn:aws:sns:us-east-1:128609716025:topic-api",
      })
      .promise();

    res.status(200).json({ mensaje: "Notificación enviada correctamente." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================
   DYNAMODB (Sesiones)
========================================== */
app.post("/alumnos/:id/session/login", async (req, res) => {
  try {
    const alumno = await Alumno.findByPk(req.params.id);
    if (!alumno || alumno.password !== req.body.password) {
      return res
        .status(400)
        .json({ error: "Las credenciales no son válidas." });
    }

    const nuevaSesion = {
      id: crypto.randomUUID(),
      alumnoId: alumno.id,
      active: true,
      sessionString: crypto.randomBytes(64).toString("hex"),
      fecha: Math.floor(Date.now() / 1000),
    };

    await dynamo
      .put({ TableName: "sesiones-alumnos", Item: nuevaSesion })
      .promise();
    res.status(200).json({ sessionString: nuevaSesion.sessionString });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/alumnos/:id/session/verify", async (req, res) => {
  try {
    const { sessionString } = req.body;
    const resultado = await dynamo
      .scan({
        TableName: "sesiones-alumnos",
        FilterExpression: "sessionString = :ss AND active = :act",
        ExpressionAttributeValues: { ":ss": sessionString, ":act": true },
      })
      .promise();

    if (resultado.Items.length > 0) {
      res.status(200).json({ mensaje: "La sesión es válida." });
    } else {
      res.status(400).json({ error: "La sesión no existe o ya caducó." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/alumnos/:id/session/logout", async (req, res) => {
  try {
    const { sessionString } = req.body;
    const resultado = await dynamo
      .scan({
        TableName: "sesiones-alumnos",
        FilterExpression: "sessionString = :ss",
        ExpressionAttributeValues: { ":ss": sessionString },
      })
      .promise();

    if (resultado.Items.length > 0) {
      const sessionId = resultado.Items[0].id;
      await dynamo
        .update({
          TableName: "sesiones-alumnos",
          Key: { id: sessionId },
          UpdateExpression: "set active = :act",
          ExpressionAttributeValues: { ":act": false },
        })
        .promise();
      res.status(200).json({ mensaje: "La sesión se ha cerrado." });
    } else {
      res.status(404).json({ error: "No se encontró la sesión." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Camino final por si buscan algo que no existe
app.use((req, res) =>
  res
    .status(404)
    .json({ error: "La dirección ingresada no existe en el sistema." }),
);

app.listen(PORT, () =>
  console.log("Servidor iniciado y listo para recibir peticiones."),
);

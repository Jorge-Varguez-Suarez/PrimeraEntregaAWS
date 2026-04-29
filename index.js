const express = require("express");
const AWS = require("aws-sdk");
const multer = require("multer");
const crypto = require("crypto");
const { sequelize, Alumno, Profesor } = require("./database");
const app = express();

app.use(express.json());
const PORT = 80;
const upload = multer({ storage: multer.memoryStorage() });

// Tus credenciales actuales de AWS
AWS.config.update({
  accessKeyId: "ASIAR34N4Q444R36M7DJ",
  secretAccessKey: "pLVetvkffC0Uy0K7fPEDfmPulBU6tsEzedNyCBGB",
  sessionToken:
    "IQoJb3JpZ2luX2VjECgaCXVzLXdlc3QtMiJGMEQCICs58djPsk4LuqMILYa37Z6/RU06eM3iGVn9YjuKFEWJAiABUvHmPVYAOvRuAEiW0h3qXR1Y7vih5BdNjvhDs4EwhirBAgjx//////////8BEAAaDDEyODYwOTcxNjAyNSIMdsAbvepZ/xBk6OkoKpUCBhFVYwkXfgsFTS1fqA6ccxakAftM4aOqueU4pjqpz8V2ljoql9coFw53KJfvG53N8r3H6369RMWMSmSy5tjq1yerPxBhAFskjNbbuRpCvVva6dqX/+oSYdeO8fD4//YYiJ51rVigT/4kJGDxfR8lsqvC3WAmJp5F8FWEYhQLxYpcXpxWY8lH3S5QoK84BlgX6QZUYPXwXf703QqhwBbsm+GcyNVRr2M4WzhvP74ek14lZBhqa/D9RGnwOL8D7gMRoEZ554YeTh9PIo+t7fh3iTcjh0MzwUqTFbgNH+txBRkd7AzR5v28usrSp56iKukPuEXw52ldzuBqNFPXrPnfZXCf9Wh2wfQcqI8hyrsO0Oir7ME/1zCe48bPBjqeAedbygh90ZxpT0ayXnL3aIsQQw7jCw1l0byNApmkIOhKRRCjQMEpKOx1AlWe85jbJvUy/0wES3ffrmrtn8tRFU/9wb/UqoZcCpcF3y1PqyY/91/I2G3o7Vwb/u+zEMRgRXb5eBWZ1GXujuvVCOHbw5QegChChyvcufD22aTrJN8JTgJ5aLlKNIdhVguQDvKik/0anIkzLzqkRCs1ZajZ",
  region: "us-east-1",
});

const s3 = new AWS.S3();
const sns = new AWS.SNS();
const dynamo = new AWS.DynamoDB.DocumentClient();

sequelize.sync();

const handleValidation = (err, res) => {
  if (
    err.name === "SequelizeValidationError" ||
    err.name === "SequelizeUniqueConstraintError"
  ) {
    return res.status(400).json({ error: "Datos inválidos" });
  }
  return res.status(500).json({ error: err.message });
};

const methodNotAllowed = (req, res) =>
  res.status(405).json({ error: "Método no permitido" });

/* --- RUTAS ESTÁNDAR --- */
app
  .route("/alumnos")
  .get(async (req, res) => res.status(200).json(await Alumno.findAll()))
  .post(async (req, res) => {
    try {
      res.status(201).json(await Alumno.create(req.body));
    } catch (err) {
      handleValidation(err, res);
    }
  })
  .all(methodNotAllowed);

app
  .route("/alumnos/:id")
  .get(async (req, res) => {
    const a = await Alumno.findByPk(req.params.id);
    a ? res.status(200).json(a) : res.status(404).json({ error: "No existe" });
  })
  .put(async (req, res) => {
    try {
      const a = await Alumno.findByPk(req.params.id);
      if (!a) return res.status(404).json({ error: "No existe" });
      await a.update(req.body);
      res.status(200).json(a);
    } catch (err) {
      handleValidation(err, res);
    }
  })
  .delete(async (req, res) => {
    const a = await Alumno.findByPk(req.params.id);
    if (!a) return res.status(404).json({ error: "No existe" });
    await a.destroy();
    res.status(200).json({ mensaje: "Eliminado" });
  });

app
  .route("/profesores")
  .get(async (req, res) => res.status(200).json(await Profesor.findAll()))
  .post(async (req, res) => {
    try {
      res.status(201).json(await Profesor.create(req.body));
    } catch (err) {
      handleValidation(err, res);
    }
  })
  .all(methodNotAllowed);

app
  .route("/profesores/:id")
  .get(async (req, res) => {
    const p = await Profesor.findByPk(req.params.id);
    p ? res.status(200).json(p) : res.status(404).json({ error: "No existe" });
  })
  .put(async (req, res) => {
    try {
      const p = await Profesor.findByPk(req.params.id);
      if (!p) return res.status(404).json({ error: "No existe" });
      await p.update(req.body);
      res.status(200).json(p);
    } catch (err) {
      handleValidation(err, res);
    }
  })
  .delete(async (req, res) => {
    const p = await Profesor.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: "No existe" });
    await p.destroy();
    res.status(200).json({ mensaje: "Eliminado" });
  });

/* --- AWS SERVICES --- */

// Corregido: Agregamos ACL public-read para evitar el 403
app.post("/alumnos/:id/fotoPerfil", upload.single("foto"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Falta la foto" });
    const a = await Alumno.findByPk(req.params.id);
    if (!a) return res.status(404).json({ error: "No existe" });

    const params = {
      Bucket: "uady-varguez-fotos-2026",
      Key: `foto-${a.id}.jpg`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: "public-read",
    };

    const result = await s3.upload(params).promise();
    await a.update({ fotoPerfilUrl: result.Location });
    res.status(200).json({ fotoPerfilUrl: result.Location });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/alumnos/:id/email", async (req, res) => {
  try {
    const a = await Alumno.findByPk(req.params.id);
    if (!a) return res.status(404).json({ error: "No existe" });
    await sns
      .publish({
        Message: `Alumno: ${a.nombres}, Promedio: ${a.promedio}`,
        TopicArn: "arn:aws:sns:us-east-1:128609716025:topic-api",
      })
      .promise();
    res.status(200).json({ mensaje: "Enviado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SESIONES: Cambiamos a 400 para fallos de validación/inexistencia
app.post("/alumnos/:id/session/login", async (req, res) => {
  try {
    const a = await Alumno.findByPk(req.params.id);
    if (!a || a.password !== req.body.password)
      return res.status(400).json({ error: "Login fallido" });

    const item = {
      id: crypto.randomUUID(),
      alumnoId: a.id,
      active: true,
      sessionString: crypto.randomBytes(64).toString("hex"),
      fecha: Math.floor(Date.now() / 1000),
    };

    await dynamo.put({ TableName: "sesiones-alumnos", Item: item }).promise();
    res.status(200).json({ sessionString: item.sessionString });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/alumnos/:id/session/verify", async (req, res) => {
  try {
    const { sessionString } = req.body;
    const result = await dynamo
      .scan({
        TableName: "sesiones-alumnos",
        FilterExpression: "sessionString = :ss AND active = :act",
        ExpressionAttributeValues: { ":ss": sessionString || "", ":act": true },
      })
      .promise();

    // Corregido: Si no hay sesión válida, devolvemos 400 como pide el test
    if (result.Items && result.Items.length > 0) {
      res.status(200).json({ mensaje: "Válida" });
    } else {
      res.status(400).json({ error: "Sesión inválida" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/alumnos/:id/session/logout", async (req, res) => {
  try {
    const { sessionString } = req.body;
    const result = await dynamo
      .scan({
        TableName: "sesiones-alumnos",
        FilterExpression: "sessionString = :ss",
        ExpressionAttributeValues: { ":ss": sessionString || "" },
      })
      .promise();

    // Corregido: Si la sesión no existe para cerrar, el test espera un 400
    if (result.Items && result.Items.length > 0) {
      await dynamo
        .update({
          TableName: "sesiones-alumnos",
          Key: { id: result.Items[0].id },
          UpdateExpression: "set active = :a",
          ExpressionAttributeValues: { ":a": false },
        })
        .promise();
      res.status(200).json({ mensaje: "Cerrada" });
    } else {
      res.status(400).json({ error: "No encontrada para cerrar" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => res.status(404).json({ error: "No encontrado" }));

app.listen(PORT, () => console.log("Servidor Final Corriendo"));

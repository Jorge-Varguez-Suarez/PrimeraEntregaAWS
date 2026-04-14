const express = require("express");
const app = express();

app.use(express.json());

const PORT = 80;

// Arrays en memoria
let alumnos = [];
let profesores = [];

/* =========================
   VALIDACIONES
========================= */

function validarAlumno(body) {
  const { id, nombres, apellidos, matricula, promedio } = body;

  if (id == null || !nombres || !apellidos || !matricula || promedio == null) {
    return "Campos incompletos";
  }

  if (typeof id !== "number") return "id debe ser número";
  if (typeof nombres !== "string") return "nombres debe ser texto";
  if (typeof apellidos !== "string") return "apellidos debe ser texto";
  if (typeof matricula !== "string") return "matricula debe ser texto";
  if (typeof promedio !== "number") return "promedio debe ser número";

  return null;
}

function validarProfesor(body) {
  const { id, numeroEmpleado, nombres, apellidos, horasClase } = body;

  if (
    id == null ||
    numeroEmpleado == null ||
    !nombres ||
    !apellidos ||
    horasClase == null
  ) {
    return "Campos incompletos";
  }

  if (typeof id !== "number") return "id debe ser número";
  if (typeof numeroEmpleado !== "number")
    return "numeroEmpleado debe ser número";
  if (typeof nombres !== "string") return "nombres debe ser texto";
  if (typeof apellidos !== "string") return "apellidos debe ser texto";
  if (typeof horasClase !== "number") return "horasClase debe ser número";

  return null;
}

/* =========================
   ENDPOINTS ALUMNOS
========================= */

app.get("/alumnos", (req, res) => {
  res.status(200).json(alumnos);
});

app.get("/alumnos/:id", (req, res) => {
  const alumno = alumnos.find((a) => a.id == req.params.id);
  if (!alumno) return res.status(404).json({ error: "Alumno no encontrado" });

  res.status(200).json(alumno);
});

app.post("/alumnos", (req, res) => {
  const error = validarAlumno(req.body);
  if (error) return res.status(400).json({ error });

  const existe = alumnos.find((a) => a.id === req.body.id);
  if (existe) return res.status(400).json({ error: "ID ya existe" });

  alumnos.push(req.body);
  res.status(201).json(req.body);
});

app.put("/alumnos/:id", (req, res) => {
  const index = alumnos.findIndex((a) => a.id == req.params.id);
  if (index === -1)
    return res.status(404).json({ error: "Alumno no encontrado" });

  const actualizado = { ...alumnos[index], ...req.body };

  const error = validarAlumno(actualizado);
  if (error) return res.status(400).json({ error });

  alumnos[index] = actualizado;
  res.status(200).json(actualizado);
});

app.delete("/alumnos/:id", (req, res) => {
  const index = alumnos.findIndex((a) => a.id == req.params.id);
  if (index === -1)
    return res.status(404).json({ error: "Alumno no encontrado" });

  alumnos.splice(index, 1);
  res.status(200).json({ mensaje: "Alumno eliminado" });
});

/* =========================
   ENDPOINTS PROFESORES
========================= */

app.get("/profesores", (req, res) => {
  res.status(200).json(profesores);
});

app.get("/profesores/:id", (req, res) => {
  const profesor = profesores.find((p) => p.id == req.params.id);
  if (!profesor)
    return res.status(404).json({ error: "Profesor no encontrado" });

  res.status(200).json(profesor);
});

app.post("/profesores", (req, res) => {
  const error = validarProfesor(req.body);
  if (error) return res.status(400).json({ error });

  const existe = profesores.find((p) => p.id === req.body.id);
  if (existe) return res.status(400).json({ error: "ID ya existe" });

  profesores.push(req.body);
  res.status(201).json(req.body);
});

app.put("/profesores/:id", (req, res) => {
  const index = profesores.findIndex((p) => p.id == req.params.id);
  if (index === -1)
    return res.status(404).json({ error: "Profesor no encontrado" });

  const actualizado = { ...profesores[index], ...req.body };

  const error = validarProfesor(actualizado);
  if (error) return res.status(400).json({ error });

  profesores[index] = actualizado;
  res.status(200).json(actualizado);
});

app.delete("/profesores/:id", (req, res) => {
  const index = profesores.findIndex((p) => p.id == req.params.id);
  if (index === -1)
    return res.status(404).json({ error: "Profesor no encontrado" });

  profesores.splice(index, 1);
  res.status(200).json({ mensaje: "Profesor eliminado" });
});

/* =========================
   CONTROL DE MÉTODOS
========================= */

app.all("/alumnos", (req, res) => {
  res.status(405).json({ error: "Método no permitido" });
});

app.all("/alumnos/:id", (req, res) => {
  res.status(405).json({ error: "Método no permitido" });
});

app.all("/profesores", (req, res) => {
  res.status(405).json({ error: "Método no permitido" });
});

app.all("/profesores/:id", (req, res) => {
  res.status(405).json({ error: "Método no permitido" });
});

/* =========================
   RUTA NO ENCONTRADA
========================= */

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

/* =========================
   SERVIDOR
========================= */

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

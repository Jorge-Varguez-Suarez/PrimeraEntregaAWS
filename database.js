const { Sequelize, DataTypes } = require("sequelize");

// Configuración de la conexión a RDS
const sequelize = new Sequelize("escuela", "admin", "JOva9718", {
  host: "db-api.cxegikuaahxv.us-east-1.rds.amazonaws.com",
  dialect: "mysql",
  port: 3306,
  logging: false,
});

// Definición de Modelos directamente aquí para simplicidad
const Alumno = sequelize.define(
  "Alumno",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombres: { type: DataTypes.STRING, allowNull: false },
    apellidos: { type: DataTypes.STRING, allowNull: false },
    matricula: { type: DataTypes.STRING, allowNull: false },
    promedio: { type: DataTypes.FLOAT, allowNull: false },
    fotoPerfilUrl: { type: DataTypes.TEXT, allowNull: true },
    password: { type: DataTypes.STRING, allowNull: false },
  },
  { timestamps: false },
);

const Profesor = sequelize.define(
  "Profesor",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    numeroEmpleado: { type: DataTypes.INTEGER, allowNull: false },
    nombres: { type: DataTypes.STRING, allowNull: false },
    apellidos: { type: DataTypes.STRING, allowNull: false },
    horasClase: { type: DataTypes.INTEGER, allowNull: false },
  },
  { timestamps: false },
);

module.exports = { sequelize, Alumno, Profesor };

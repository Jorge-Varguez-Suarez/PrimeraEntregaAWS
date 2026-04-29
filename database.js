const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize("escuela", "admin", "JOva9718", {
  host: "db-api.cxegikuaahxv.us-east-1.rds.amazonaws.com",
  dialect: "mysql",
  port: 3306,
  logging: false,
});

const Alumno = sequelize.define(
  "Alumno",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombres: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    apellidos: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    matricula: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    promedio: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 0, max: 100 },
    },
    fotoPerfilUrl: { type: DataTypes.TEXT, allowNull: true },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
  },
  { timestamps: false },
);

const Profesor = sequelize.define(
  "Profesor",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    numeroEmpleado: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    nombres: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    apellidos: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    horasClase: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
  },
  { timestamps: false },
);

module.exports = { sequelize, Alumno, Profesor };

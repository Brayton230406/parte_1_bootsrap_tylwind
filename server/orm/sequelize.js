// Mapeo de las tablas existentes: nunca llama sync() ni modifica el esquema.
import { Sequelize, DataTypes } from 'sequelize';
import schema from '../config/schema.json' with { type: 'json' };

const options = {
  dialect: 'postgres', logging: false,
  host: process.env.PGHOST || 'localhost', port: Number(process.env.PGPORT || 5432),
  pool: { max: 5, min: 0, acquire: 5000, idle: 10000 },
  dialectOptions: process.env.PGSSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {},
};
export const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, options)
  : new Sequelize(process.env.PGDATABASE || process.env.PGUSER || process.env.USER, process.env.PGUSER || process.env.USER, process.env.PGPASSWORD || '', options);

function sqlType(type) {
  if (type === 'BIGINT') return DataTypes.BIGINT;
  if (type === 'INTEGER') return DataTypes.INTEGER;
  if (type === 'SMALLINT') return DataTypes.SMALLINT;
  if (type === 'BOOLEAN') return DataTypes.BOOLEAN;
  if (type === 'DATE') return DataTypes.DATEONLY;
  if (type === 'TIMESTAMPTZ') return DataTypes.DATE;
  if (type === 'TEXT') return DataTypes.TEXT;
  let match = /^NUMERIC\((\d+),(\d+)\)$/.exec(type);
  if (match) return DataTypes.DECIMAL(Number(match[1]), Number(match[2]));
  match = /^(VARCHAR|CHAR)\((\d+)\)$/.exec(type);
  if (match) return match[1] === 'CHAR' ? DataTypes.CHAR(Number(match[2])) : DataTypes.STRING(Number(match[2]));
  throw new Error(`Tipo no mapeado: ${type}`);
}
export const models = Object.freeze(Object.fromEntries(Object.entries(schema).map(([name, table]) => {
  const attributes = Object.fromEntries(table.columns.map(column => [column.name, {
    type: sqlType(column.type), primaryKey: table.primaryKey.includes(column.name),
    allowNull: !column.required,
  }]));
  return [name, sequelize.define(name, attributes, { tableName: name, schema: 'michoks', timestamps: false, freezeTableName: true })];
})));

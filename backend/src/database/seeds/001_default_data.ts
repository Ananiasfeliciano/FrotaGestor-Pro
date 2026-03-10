import { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // Limpar tabelas
  await knex('audit_logs').del();
  await knex('inspection_items').del();
  await knex('inspections').del();
  await knex('receipt_items').del();
  await knex('receipts').del();
  await knex('fuel_stations').del();
  await knex('workshops').del();
  await knex('auto_part_stores').del();
  await knex('vehicles').del();
  await knex('users').del();

  // Criar usuários padrão
  const adminHash = await bcrypt.hash('str@10108893', 12);
  const operadorHash = await bcrypt.hash('Operador1!', 12);

  await knex('users').insert([
    {
      name: 'SARTINFO',
      username: 'SARTINFO',
      password_hash: adminHash,
      role: 'Administrador',
      status: 'Ativo',
    },
    {
      name: 'OPERADOR',
      username: 'OPERADOR',
      password_hash: operadorHash,
      role: 'Operador',
      status: 'Ativo',
    },
  ]);

  // Settings padrão
  await knex('settings').insert([
    { key: 'companyName', value: JSON.stringify('SARTINFO') },
    { key: 'revisionCycleDays', value: JSON.stringify(365) },
    { key: 'alertThresholdDays', value: JSON.stringify(30) },
    { key: 'oilAlertThresholdKm', value: JSON.stringify(1000) },
  ]);
}

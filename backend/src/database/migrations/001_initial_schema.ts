import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Extensões ──────────────────────────────────────────
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // ── Usuários ───────────────────────────────────────────
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name', 255).notNullable();
    t.string('username', 100).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.enum('role', ['Administrador', 'Operador']).notNullable().defaultTo('Operador');
    t.enum('status', ['Ativo', 'Inativo']).notNullable().defaultTo('Ativo');
    t.timestamps(true, true);
  });

  // ── Veículos ───────────────────────────────────────────
  await knex.schema.createTable('vehicles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('placa', 20).notNullable().unique();
    t.string('renavam', 30).notNullable();
    t.string('chassi', 50).notNullable();
    t.string('marca', 100).notNullable();
    t.string('modelo', 100).notNullable();
    t.integer('ano_fabricacao').notNullable();
    t.integer('ano_modelo').notNullable();
    t.string('tipo_veiculo', 50).notNullable();
    t.string('cor', 50).notNullable();
    t.string('combustivel', 50).notNullable();
    t.integer('quilometragem').notNullable().defaultTo(0);
    t.date('data_ultima_revisao');
    t.enum('status', ['ativo', 'manutencao', 'inativo']).notNullable().defaultTo('ativo');
    t.text('observacoes').defaultTo('');
    t.string('crlv_url', 500);
    t.string('seguro_url', 500);
    t.timestamps(true, true);
  });

  // ── Postos de Combustível ──────────────────────────────
  await knex.schema.createTable('fuel_stations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('nome', 255).notNullable();
    t.string('cnpj', 30).notNullable();
    t.string('endereco', 500).notNullable();
    t.string('telefone', 30).notNullable();
    t.text('observacoes').defaultTo('');
    t.string('combustiveis_disponiveis', 255).defaultTo('');
    t.timestamps(true, true);
  });

  // ── Oficinas ───────────────────────────────────────────
  await knex.schema.createTable('workshops', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('nome', 255).notNullable();
    t.string('cnpj', 30).notNullable();
    t.string('endereco', 500).notNullable();
    t.string('telefone', 30).notNullable();
    t.text('observacoes').defaultTo('');
    t.string('especialidades', 255).defaultTo('');
    t.timestamps(true, true);
  });

  // ── Lojas de Peças ─────────────────────────────────────
  await knex.schema.createTable('auto_part_stores', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('nome', 255).notNullable();
    t.string('cnpj', 30).notNullable();
    t.string('endereco', 500).notNullable();
    t.string('telefone', 30).notNullable();
    t.text('observacoes').defaultTo('');
    t.string('tipos_pecas', 255).defaultTo('');
    t.timestamps(true, true);
  });

  // ── Notas / Recibos ───────────────────────────────────
  await knex.schema.createTable('receipts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('vehicle_id').notNullable().references('id').inTable('vehicles').onDelete('CASCADE');
    t.enum('resource_type', ['station', 'workshop', 'parts']).notNullable();
    t.uuid('resource_id').notNullable();
    t.date('date').notNullable();
    t.decimal('value', 12, 2).notNullable();
    t.string('description', 500).notNullable();
    t.string('document_number', 100);
    t.integer('mileage');
    // Posto
    t.string('fuel_type', 50);
    t.decimal('liters', 10, 3);
    t.decimal('price_per_liter', 10, 4);
    // Oficina
    t.date('warranty_until');
    t.string('professional', 200);
    // Troca de óleo
    t.boolean('is_oil_change').defaultTo(false);
    t.integer('next_oil_change_km');
    t.timestamps(true, true);
  });

  // ── Itens da Nota ──────────────────────────────────────
  await knex.schema.createTable('receipt_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('receipt_id').notNullable().references('id').inTable('receipts').onDelete('CASCADE');
    t.string('description', 500).notNullable();
    t.integer('quantity').notNullable().defaultTo(1);
    t.decimal('unit_value', 12, 2).notNullable();
    t.timestamps(true, true);
  });

  // ── Inspeções ──────────────────────────────────────────
  await knex.schema.createTable('inspections', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('vehicle_id').notNullable().references('id').inTable('vehicles').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('data').notNullable().defaultTo(knex.fn.now());
    t.enum('status_final', ['Aprovado', 'Reprovado']).notNullable();
    t.text('observacoes_gerais').defaultTo('');
    t.jsonb('photo_urls').defaultTo('[]');
    t.timestamps(true, true);
  });

  // ── Itens da Inspeção ──────────────────────────────────
  await knex.schema.createTable('inspection_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('inspection_id').notNullable().references('id').inTable('inspections').onDelete('CASCADE');
    t.string('name', 200).notNullable();
    t.enum('status', ['OK', 'Atenção', 'Problema']).notNullable();
    t.text('observation').defaultTo('');
    t.timestamps(true, true);
  });

  // ── Logs de Auditoria ─────────────────────────────────
  await knex.schema.createTable('audit_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.string('user_name', 255).notNullable();
    t.string('action', 100).notNullable();
    t.string('module', 100).notNullable();
    t.text('details').defaultTo('');
    t.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
  });

  // ── Configurações ─────────────────────────────────────
  await knex.schema.createTable('settings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('key', 100).notNullable().unique();
    t.jsonb('value').notNullable();
    t.timestamps(true, true);
  });

  // ── Índices ────────────────────────────────────────────
  await knex.schema.raw('CREATE INDEX idx_vehicles_placa ON vehicles(placa)');
  await knex.schema.raw('CREATE INDEX idx_vehicles_status ON vehicles(status)');
  await knex.schema.raw('CREATE INDEX idx_receipts_vehicle ON receipts(vehicle_id)');
  await knex.schema.raw('CREATE INDEX idx_receipts_resource ON receipts(resource_type, resource_id)');
  await knex.schema.raw('CREATE INDEX idx_receipts_date ON receipts(date DESC)');
  await knex.schema.raw('CREATE INDEX idx_inspections_vehicle ON inspections(vehicle_id)');
  await knex.schema.raw('CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC)');
  await knex.schema.raw('CREATE INDEX idx_audit_logs_user ON audit_logs(user_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('inspection_items');
  await knex.schema.dropTableIfExists('inspections');
  await knex.schema.dropTableIfExists('receipt_items');
  await knex.schema.dropTableIfExists('receipts');
  await knex.schema.dropTableIfExists('fuel_stations');
  await knex.schema.dropTableIfExists('workshops');
  await knex.schema.dropTableIfExists('auto_part_stores');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('settings');
  await knex.schema.dropTableIfExists('vehicles');
  await knex.schema.dropTableIfExists('users');
}

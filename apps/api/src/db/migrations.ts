/**
 * Database Migration Runner
 * Applies migrations to set up schema, roles, and initial data.
 * Can be called from CLI or within application startup.
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Logger } from '@nestjs/common';

const logger = new Logger('DatabaseMigrations');

export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    logger.log('Starting database migrations...');

    // 1. Read and execute schema.sql
    const schemaPath = join(__dirname, 'schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf8');

    logger.log('Executing schema.sql...');
    await client.query(schemaSql);
    logger.log('✓ Schema created');

    // 2. Set up role permissions
    logger.log('Setting up role permissions...');
    await setupRolePermissions(client);
    logger.log('✓ Roles configured');

    logger.log('✅ Migrations completed successfully');
  } catch (err) {
    logger.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function setupRolePermissions(client: any): Promise<void> {
  // Grant app_user basic SELECT on subjects
  await client.query(`
    GRANT SELECT ON subjects TO app_user;
  `);

  // Grant app_user INSERT/UPDATE on vaults and vault_items
  await client.query(`
    GRANT SELECT, INSERT, UPDATE ON vaults TO app_user;
    GRANT SELECT, INSERT, UPDATE ON vault_items TO app_user;
    GRANT SELECT, INSERT ON consents TO app_user;
  `);

  // Grant app_worker explicit narrow access
  // Workers can insert/update vaults and vault_items, select from subjects
  await client.query(`
    GRANT SELECT ON subjects TO app_worker;
    GRANT SELECT, INSERT, UPDATE ON vaults TO app_worker;
    GRANT SELECT, INSERT, UPDATE ON vault_items TO app_worker;
    GRANT INSERT ON audit_chain TO app_worker;
  `);

  // Grant app_reviewer access to audit_chain
  await client.query(`
    GRANT SELECT ON audit_chain TO app_reviewer;
  `);

  // Grant app_official access (read aggregates only, not user tables)
  // This is enforced by omitting policies (no policy = no access via RLS)
  await client.query(`
    GRANT USAGE ON SCHEMA public TO app_official;
  `);

  // Grant app_admin superuser (done at role creation)
}

export async function rollbackMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    logger.log('Rolling back database migrations...');

    // Drop tables in reverse order (respect foreign keys)
    await client.query(`
      DROP TABLE IF EXISTS audit_chain CASCADE;
      DROP TABLE IF EXISTS consents CASCADE;
      DROP TABLE IF EXISTS vault_items CASCADE;
      DROP TABLE IF EXISTS vaults CASCADE;
      DROP TABLE IF EXISTS subjects CASCADE;
    `);

    // Drop roles
    await client.query(`
      DROP ROLE IF EXISTS app_user;
      DROP ROLE IF EXISTS app_worker;
      DROP ROLE IF EXISTS app_reviewer;
      DROP ROLE IF EXISTS app_official;
      DROP ROLE IF EXISTS app_admin;
    `);

    logger.log('✅ Rollback completed successfully');
  } catch (err) {
    logger.error('Rollback failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

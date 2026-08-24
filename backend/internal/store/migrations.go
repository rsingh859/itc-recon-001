package store

import (
	"context"
	"database/sql"
	_ "embed"
	"fmt"
	"log"
)

//go:embed migrations/000001_init_schema.up.sql
var migration001InitSchema string

//go:embed migrations/000002_rls_policies.up.sql
var migration002RLSPolicies string

//go:embed migrations/000003_seed_data.up.sql
var migration003SeedData string

type migration struct {
	version int
	name    string
	script  string
	runInTx bool
}

// RunMigrations applies schema DDL, RLS policies, and seeds automatically on startup
func RunMigrations(ctx context.Context, db *sql.DB) error {
	// Create schema_migrations table if it doesn't exist
	_, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INT PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	migrations := []migration{
		{version: 1, name: "000001_init_schema", script: migration001InitSchema, runInTx: true},
		{version: 2, name: "000002_rls_policies", script: migration002RLSPolicies, runInTx: false}, // DO block in RLS
		{version: 3, name: "000003_seed_data", script: migration003SeedData, runInTx: true},
	}

	for _, m := range migrations {
		var exists bool
		err := db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)", m.version).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check migration version %d: %w", m.version, err)
		}

		if exists {
			continue
		}

		log.Printf("Applying database migration %d: %s...", m.version, m.name)

		if m.runInTx {
			tx, err := db.BeginTx(ctx, nil)
			if err != nil {
				return fmt.Errorf("failed to begin transaction for migration %d: %w", m.version, err)
			}

			if _, err := tx.ExecContext(ctx, m.script); err != nil {
				_ = tx.Rollback()
				return fmt.Errorf("failed to execute migration %d (%s): %w", m.version, m.name, err)
			}

			if _, err := tx.ExecContext(ctx, "INSERT INTO schema_migrations (version, name) VALUES ($1, $2)", m.version, m.name); err != nil {
				_ = tx.Rollback()
				return fmt.Errorf("failed to record migration %d: %w", m.version, err)
			}

			if err := tx.Commit(); err != nil {
				return fmt.Errorf("failed to commit migration %d: %w", m.version, err)
			}
		} else {
			if _, err := db.ExecContext(ctx, m.script); err != nil {
				return fmt.Errorf("failed to execute migration %d: %w", m.version, err)
			}
			if _, err := db.ExecContext(ctx, "INSERT INTO schema_migrations (version, name) VALUES ($1, $2)", m.version, m.name); err != nil {
				return fmt.Errorf("failed to record migration %d: %w", m.version, err)
			}
		}

		log.Printf("Successfully applied migration %d: %s", m.version, m.name)
	}

	return nil
}

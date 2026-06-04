<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use RuntimeException;

class DatabaseHealthService
{
    public function pingMongo(): array
    {
        $this->assertMongoExtensionLoaded();

        $database = trim((string) config('database.connections.mongodb.database'));

        if ($database === '') {
            throw new RuntimeException('MONGODB_DATABASE belum diatur pada environment backend.');
        }

        $connection = DB::connection('mongodb');

        if (! method_exists($connection, 'getClient') || $connection->getClient() === null) {
            throw new RuntimeException('MongoDB client tidak tersedia. Periksa konfigurasi koneksi mongodb di Laravel.');
        }

        $startedAt = microtime(true);
        $connection->getClient()
            ->selectDatabase($database)
            ->command(['ping' => 1]);

        return [
            'database' => $database,
            'driver' => 'mongodb',
            'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            'config' => $this->safeConfigSummary(),
        ];
    }

    public function safeConfigSummary(): array
    {
        $dsn = trim((string) config('database.connections.mongodb.dsn'));

        return [
            'default_connection' => (string) config('database.default'),
            'database' => (string) config('database.connections.mongodb.database'),
            'dsn_scheme' => str_starts_with($dsn, 'mongodb+srv://')
                ? 'mongodb+srv'
                : (str_starts_with($dsn, 'mongodb://') ? 'mongodb' : 'unknown'),
            'uses_atlas_host' => str_contains($dsn, 'mongodb.net'),
            'has_auth_database' => trim((string) config('database.connections.mongodb.options.database')) !== '',
        ];
    }

    public function assertMongoExtensionLoaded(): void
    {
        if (! extension_loaded('mongodb')) {
            throw new RuntimeException('MongoDB PHP extension belum aktif di environment PHP ini.');
        }
    }
}

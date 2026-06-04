<?php

use App\Support\DatabaseErrorResponder;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use MongoDB\Driver\Exception\Exception as MongoDriverException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'auth.token' => \App\Http\Middleware\AuthTokenMiddleware::class,
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (MongoDriverException $exception, Request $request) {
            if ($request->is('api/*')) {
                return DatabaseErrorResponder::mongoUnavailable($exception);
            }
        });

        $exceptions->render(function (QueryException $exception, Request $request) {
            if ($request->is('api/*') && DatabaseErrorResponder::isMongoConnectivityError($exception)) {
                return DatabaseErrorResponder::mongoUnavailable($exception);
            }
        });
    })->create();

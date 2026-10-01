<?php

use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\ResolveMerchant;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'merchant' => ResolveMerchant::class,
            'admin' => EnsureAdmin::class,
        ]);
        $middleware->validateCsrfTokens(except: ['payments/*']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $envelope = fn (string $message, string $code, int $status, array $errors = []) => response()->json([
            'message' => $message,
            'code' => $code,
            'errors' => (object) $errors,
        ], $status);

        $exceptions->render(function (ValidationException $exception, Request $request) use ($envelope) {
            if ($request->is('api/*')) {
                return $envelope($exception->validator->errors()->first(), 'validation_failed', 422, $exception->errors());
            }
        });

        $exceptions->render(function (AuthenticationException $exception, Request $request) use ($envelope) {
            if ($request->is('api/*')) {
                return $envelope('يرجى تسجيل الدخول للمتابعة.', 'unauthenticated', 401);
            }
        });

        $exceptions->render(function (AuthorizationException $exception, Request $request) use ($envelope) {
            if ($request->is('api/*')) {
                return $envelope('ليس لديك صلاحية لتنفيذ هذا الإجراء.', 'forbidden', 403);
            }
        });

        $exceptions->render(function (NotFoundHttpException $exception, Request $request) use ($envelope) {
            if ($request->is('api/*')) {
                return $envelope($exception->getPrevious() instanceof ModelNotFoundException ? 'العنصر المطلوب غير موجود.' : 'المسار غير موجود.', 'not_found', 404);
            }
        });

        $exceptions->render(function (HttpExceptionInterface $exception, Request $request) use ($envelope) {
            if ($request->is('api/*') && $exception->getStatusCode() === 429) {
                return $envelope('محاولات كثيرة، يرجى المحاولة لاحقاً.', 'too_many_requests', 429);
            }
        });
    })->create();

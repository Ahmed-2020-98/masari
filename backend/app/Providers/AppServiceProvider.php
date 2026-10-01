<?php

namespace App\Providers;

use App\Models\User;
use App\Services\Payments\FakeGateway;
use App\Services\Payments\PaymentGateway;
use App\Services\Payments\TapGateway;
use App\Services\Push\LogPushSender;
use App\Services\Push\PushSender;
use App\Services\Sms\LogSmsSender;
use App\Services\Sms\SmsSender;
use App\Services\Sms\UnifonicSmsSender;
use Dedoc\Scramble\Scramble;
use Dedoc\Scramble\Support\Generator\OpenApi;
use Dedoc\Scramble\Support\Generator\SecurityScheme;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(SmsSender::class, fn (): SmsSender => match (config('masari.sms.driver')) {
            'unifonic' => new UnifonicSmsSender((string) config('masari.sms.unifonic.app_sid'), (string) config('masari.sms.unifonic.sender')),
            default => new LogSmsSender,
        });

        $this->app->singleton(PushSender::class, LogPushSender::class);

        $this->app->singleton(PaymentGateway::class, fn (): PaymentGateway => match (config('masari.payments.driver')) {
            'tap' => new TapGateway(config('masari.payments.tap')),
            default => new FakeGateway,
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Model::automaticallyEagerLoadRelationships();
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('otp', fn (Request $request) => [
            Limit::perMinute(3)->by($request->ip()),
            Limit::perHour(10)->by((string) $request->input('phone')),
        ]);
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));

        Gate::before(fn (User $user): ?bool => $user->isAdmin() && $user->hasRole('super_admin') ? true : null);
        Gate::define('viewApiDocs', fn (?User $user = null): bool => true);

        Scramble::configure()
            ->routes(fn ($route): bool => str_starts_with($route->uri, 'api/v1'))
            ->withDocumentTransformers(function (OpenApi $openApi): void {
                $openApi->secure(SecurityScheme::http('bearer'));
            });
    }
}

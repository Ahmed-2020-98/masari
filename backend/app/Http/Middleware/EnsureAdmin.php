<?php

namespace App\Http\Middleware;

use App\Exceptions\DomainException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restricts back-office routes to admin users, optionally requiring one of the given permissions.
 */
class EnsureAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, ?string $permission = null): Response
    {
        $user = $request->user();

        if (! $user?->isAdmin() || ! $user->is_active) {
            throw new DomainException('ليس لديك صلاحية للوصول إلى لوحة الإدارة.', 'forbidden', 403);
        }

        if ($permission && ! $user->hasRole('super_admin') && ! $user->can($permission)) {
            throw new DomainException('ليس لديك صلاحية لتنفيذ هذا الإجراء.', 'forbidden', 403);
        }

        return $next($request);
    }
}

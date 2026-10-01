<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserType;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\Activity;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

class AdminUserController extends Controller
{
    /**
     * Back-office users and available roles.
     */
    public function index(): AnonymousResourceCollection
    {
        return UserResource::collection(User::query()->where('type', UserType::Admin)->with('roles')->orderBy('id')->get())
            ->additional(['roles' => Role::query()->with('permissions')->get()->map(fn (Role $role) => [
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name'),
            ])]);
    }

    /**
     * Create an admin user.
     */
    public function store(Request $request): JsonResponse
    {
        $request->merge(['phone' => Phone::normalize((string) $request->input('phone'))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'regex:/^\+9665\d{8}$/', Rule::unique('users', 'phone')],
            'email' => ['nullable', 'email', Rule::unique('users', 'email')],
            'password' => ['required', Password::min(10)->letters()->numbers()],
            'role' => ['required', 'exists:roles,name'],
        ]);

        $user = User::create([...collect($data)->except('role')->all(), 'type' => UserType::Admin, 'phone_verified_at' => now()]);
        $user->assignRole($data['role']);
        Activity::log('admin.admin_created', $user, ['role' => $data['role']]);

        return UserResource::make($user)->response()->setStatusCode(201);
    }

    /**
     * Change role or deactivate an admin.
     */
    public function update(Request $request, User $user): UserResource
    {
        abort_unless($user->isAdmin(), 404);
        $data = $request->validate([
            'role' => ['sometimes', 'exists:roles,name'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['role'])) {
            $user->syncRoles([$data['role']]);
        }

        if (array_key_exists('is_active', $data)) {
            $user->update(['is_active' => $data['is_active']]);
            if (! $data['is_active']) {
                $user->tokens()->delete();
            }
        }

        Activity::log('admin.admin_updated', $user, $data);

        return UserResource::make($user->load('roles'));
    }
}

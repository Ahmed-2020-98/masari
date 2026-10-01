<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    /**
     * Back-office roles and permissions.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = ['merchants.manage', 'shipments.manage', 'carriers.manage', 'finance.manage', 'support.manage', 'content.manage', 'admins.manage'];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $roles = [
            'super_admin' => $permissions,
            'operations' => ['merchants.manage', 'shipments.manage', 'carriers.manage', 'support.manage'],
            'finance' => ['merchants.manage', 'finance.manage'],
            'support' => ['shipments.manage', 'support.manage'],
        ];

        foreach ($roles as $name => $rolePermissions) {
            Role::findOrCreate($name, 'web')->syncPermissions($rolePermissions);
        }
    }
}
